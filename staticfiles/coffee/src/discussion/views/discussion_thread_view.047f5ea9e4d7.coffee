if Backbone?
  class @DiscussionThreadView extends DiscussionContentView

    INITIAL_RESPONSE_PAGE_SIZE = 25
    SUBSEQUENT_RESPONSE_PAGE_SIZE = 100

    events:
      "click .discussion-submit-post": "submitComment"
      "click .add-response-btn": "scrollToAddResponse"
      "click .forum-thread-expand": "expand"
      "click .forum-thread-collapse": "collapse"

    $: (selector) ->
      @$el.find(selector)

    isQuestion: ->
      @model.get("thread_type") == "question"

    initialize: (options) ->
      super()
      @mode = options.mode or "inline"  # allowed values are "tab" or "inline"
      @context = options.context or "course"  # allowed values are "course" or "standalone"
      if @mode not in ["tab", "inline"]
        throw new Error("invalid mode: " + @mode)

      @readOnly = $(".discussion-module").data('read-only')

      # Quick fix to have an actual model when we're receiving new models from
      # the server.
      @model.collection.on "reset", (collection) =>
        id = @model.get("id")
        @model = collection.get(id) if collection.get(id)

      @createShowView()
      @responses = new Comments()
      @loadedResponses = false
      if @isQuestion()
        @markedAnswers = new Comments()

    rerender: () ->
      if @showView?
        @showView.undelegateEvents()
      @undelegateEvents()
      @$el.empty()
      @initialize(
        mode: @mode
        model: @model
        el: @el
        course_settings: @course_settings
        topicId: @topicId
      )
      @render()

    renderTemplate: ->
      @template = _.template($("#thread-template").html())
      container = $("#discussion-container")
      if !container.length
        # inline discussion
        container = $(".discussion-module")
      templateData = _.extend(
        @model.toJSON(),
        readOnly: @readOnly,
        can_create_comment: container.data("user-create-comment")
      )
      @template(templateData)

    render: ->
      @$el.html(@renderTemplate())
      @delegateEvents()

      @renderShowView()
      @renderAttrs()

      @$("span.timeago").timeago()
      @makeWmdEditor "reply-body"
      @renderAddResponseButton()
      @responses.on("add", (response) => @renderResponseToList(response, ".js-response-list", {}))
      if @isQuestion()
        @markedAnswers.on("add", (response) => @renderResponseToList(response, ".js-marked-answer-list", {collapseComments: true}))
      if @mode == "tab"
        # Without a delay, jQuery doesn't add the loading extension defined in
        # utils.coffee before safeAjax is invoked, which results in an error
        setTimeout((=> @loadInitialResponses()), 100)
        @$(".post-tools").hide()
      else # mode == "inline"
        @collapse()

    attrRenderer: $.extend({}, DiscussionContentView.prototype.attrRenderer, {
      closed: (closed) ->
        @$(".discussion-reply-new").toggle(not closed)
        @$('.comment-form').closest('li').toggle(not closed)
        @$(".action-vote").toggle(not closed)
        @$(".display-vote").toggle(closed)
        @renderAddResponseButton()
    })

    expand: (event) ->
      if event
        event.preventDefault()
      @$el.addClass("expanded")
      @$el.find(".post-body").text(@model.get("body"))
      @showView.convertMath()
      @$el.find(".forum-thread-expand").hide()
      @$el.find(".forum-thread-collapse").show()
      @$el.find(".post-extended-content").show()
      if not @loadedResponses
        @loadInitialResponses()

    collapse: (event) ->
      if event
        event.preventDefault()
      @$el.removeClass("expanded")
      @$el.find(".post-body").text(@getAbbreviatedBody())
      @showView.convertMath()
      @$el.find(".forum-thread-expand").show()
      @$el.find(".forum-thread-collapse").hide()
      @$el.find(".post-extended-content").hide()

    getAbbreviatedBody: ->
      cached = @model.get("abbreviatedBody")
      if cached
        cached
      else
        abbreviated = DiscussionUtil.abbreviateString @model.get("body"), 140
        @model.set("abbreviatedBody", abbreviated)
        abbreviated

    cleanup: ->
      if @responsesRequest?
        @responsesRequest.abort()

    loadResponses: (responseLimit, elem, firstLoad) ->
      # takeFocus take the page focus to response loading element while responses are being fetched.
      # - When viewing in the Discussions tab, responses are loaded automatically, Do not scroll to the
      # element(TNL-1530)
      # - When viewing inline in courseware, user clicks 'expand' to open responses, Its ok to scroll to the
      # element (Default)
      takeFocus = if @mode == "tab" then false else true
      @responsesRequest = DiscussionUtil.safeAjax
        url: DiscussionUtil.urlFor('retrieve_single_thread', @model.get('commentable_id'), @model.id)
        data:
          resp_skip: @responses.size()
          resp_limit: responseLimit if responseLimit
        $elem: elem
        $loading: elem
        takeFocus: takeFocus
        complete: =>
          @responsesRequest = null
        success: (data, textStatus, xhr) =>
          Content.loadContentInfos(data['annotated_content_info'])
          if @isQuestion()
            @markedAnswers.add(data["content"]["endorsed_responses"])
          @responses.add(
            if @isQuestion()
            then data["content"]["non_endorsed_responses"]
            else data["content"]["children"]
          )
          @renderResponseCountAndPagination(
            if @isQuestion()
            then data["content"]["non_endorsed_resp_total"]
            else data["content"]["resp_total"]
          )
          @trigger "thread:responses:rendered"
          @loadedResponses = true
          @$el.find('.discussion-article[data-id="' + @model.id + '"]').focus() # Sends focus to the discussion once the thread loads
        error: (xhr, textStatus) =>
          return if textStatus == 'abort'

          if xhr.status == 404
            DiscussionUtil.discussionAlert(
              gettext("Sorry"),
              gettext("The thread you selected has been deleted. Please select another thread.")
            )
          else if firstLoad
            DiscussionUtil.discussionAlert(
              gettext("Sorry"),
              gettext("We had some trouble loading responses. Please reload the page.")
            )
          else
            DiscussionUtil.discussionAlert(
              gettext("Sorry"),
              gettext("We had some trouble loading more responses. Please try again.")
            )

    loadInitialResponses: () ->
      @loadResponses(INITIAL_RESPONSE_PAGE_SIZE, @$el.find(".js-response-list"), true)

    renderResponseCountAndPagination: (responseTotal) =>
      if @isQuestion() && @markedAnswers.length != 0
        responseCountFormat = ngettext(
          "%(numResponses)s other response",
          "%(numResponses)s other responses",
          responseTotal
        )
      else
        responseCountFormat = ngettext(
          "%(numResponses)s response",
          "%(numResponses)s responses",
          responseTotal
        )
      @$el.find(".response-count").html(
        interpolate(
          responseCountFormat,
          {numResponses: responseTotal},
          true
        )
      )
      responsePagination = @$el.find(".response-pagination")
      responsePagination.empty()
      if responseTotal > 0
        responsesRemaining = responseTotal - @responses.size()
        showingResponsesText =
          if responsesRemaining == 0
            gettext("Showing all responses")
          else
            interpolate(
              ngettext(
                "Showing first response",
                "Showing first %(numResponses)s responses",
                @responses.size()
              ),
              {numResponses: @responses.size()},
              true
            )
        responsePagination.append($("<span>").addClass("response-display-count").html(
          _.escape(showingResponsesText)
        ))
        if responsesRemaining > 0
          if responsesRemaining < SUBSEQUENT_RESPONSE_PAGE_SIZE
            responseLimit = null
            buttonText = gettext("Load all responses")
          else
            responseLimit = SUBSEQUENT_RESPONSE_PAGE_SIZE
            buttonText = interpolate(
              gettext("Load next %(numResponses)s responses"),
              {numResponses: responseLimit},
              true
            )
          loadMoreButton = $("<button>").addClass("load-response-button").html(
            _.escape(buttonText)
          )
          loadMoreButton.click((event) => @loadResponses(responseLimit, loadMoreButton))
          responsePagination.append(loadMoreButton)

    renderResponseToList: (response, listSelector, options) =>
        response.set('thread', @model)
        view = new ThreadResponseView($.extend({model: response}, options))
        view.on "comment:add", @addComment
        view.on "comment:endorse", @endorseThread
        view.render()
        @$el.find(listSelector).append(view.el)
        view.afterInsert()

    renderAddResponseButton: =>
      if @model.hasResponses() and @model.can('can_reply') and !@model.get('closed')
        @$el.find('div.add-response').show()
      else
        @$el.find('div.add-response').hide()

    scrollToAddResponse: (event) ->
      event.preventDefault()
      form = $(event.target).parents('article.discussion-article').find('form.discussion-reply-new')
      $('html, body').scrollTop(form.offset().top)
      form.find('.wmd-panel textarea').focus()

    addComment: =>
      @model.comment()

    endorseThread: =>
      @model.set 'endorsed', @$el.find(".action-answer.is-checked").length > 0

    submitComment: (event) ->
      event.preventDefault()
      url = @model.urlFor('reply')
      body = @getWmdContent("reply-body")
      return if not body.trim().length
      @setWmdContent("reply-body", "")
      comment = new Comment(body: body, created_at: (new Date()).toISOString(), username: window.user.get("username"), votes: { up_count: 0 }, abuse_flaggers:[], endorsed: false, user_id: window.user.get("id"))
      comment.set('thread', @model.get('thread'))
      @renderResponseToList(comment, ".js-response-list")
      @model.addComment()
      @renderAddResponseButton()

      DiscussionUtil.safeAjax
        $elem: $(event.target)
        url: url
        type: "POST"
        dataType: 'json'
        data:
          body: body
        success: (data, textStatus) =>
          comment.updateInfo(data.annotated_content_info)
          comment.set(data.content)

    edit: (event) =>
      @createEditView()
      @renderEditView()

    createEditView: () ->
      if @showView?
        @showView.undelegateEvents()
        @showView.$el.empty()
        @showView = null

      @editView = new DiscussionThreadEditView(
        container: @$('.thread-content-wrapper')
        model: @model
        mode: @mode
        context: @context
        course_settings: @options.course_settings
      )
      @editView.bind "thread:updated thread:cancel_edit", @closeEditView
      @editView.bind "comment:endorse", @endorseThread

    renderSubView: (view) ->
      view.setElement(@$('.thread-content-wrapper'))
      view.render()
      view.delegateEvents()

    renderEditView: () ->
      @editView.render()

    createShowView: () ->
      @showView = new DiscussionThreadShowView({model: @model, mode: @mode})
      @showView.bind "thread:_delete", @_delete
      @showView.bind "thread:edit", @edit

    renderShowView: () ->
      @renderSubView(@showView)

    closeEditView: (event) =>
      @createShowView()
      @renderShowView()
      @renderAttrs()
      # next call is necessary to re-render the post action controls after
      # submitting or cancelling a thread edit in inline mode.
      @$el.find(".post-extended-content").show()

    # If you use "delete" here, it will compile down into JS that includes the
    # use of DiscussionThreadView.prototype.delete, and that will break IE8
    # because "delete" is a keyword. So, using an underscore to prevent that.
    _delete: (event) =>
      url = @model.urlFor('_delete')
      if not @model.can('can_delete')
        return
      if not confirm gettext("Are you sure you want to delete this post?")
        return
      @model.remove()
      @showView.undelegateEvents()
      @undelegateEvents()
      @$el.empty()
      $elem = $(event.target)
      DiscussionUtil.safeAjax
        $elem: $elem
        url: url
        type: "POST"
        success: (response, textStatus) =>
