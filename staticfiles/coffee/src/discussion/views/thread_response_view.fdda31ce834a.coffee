if Backbone?
  class @ThreadResponseView extends DiscussionContentView
    tagName: "li"
    className: "forum-response"

    events:
        "click .discussion-submit-comment": "submitComment"
        "focus .wmd-input": "showEditorChrome"

    $: (selector) ->
      @$el.find(selector)

    initialize: (options) ->
      @collapseComments = options.collapseComments
      @createShowView()
      @readOnly = $('.discussion-module').data('read-only')

    renderTemplate: ->
      @template = _.template($("#thread-response-template").html())

      container = $("#discussion-container")
      if !container.length
        # inline discussion
        container = $(".discussion-module")
      templateData = _.extend(
        @model.toJSON(),
        wmdId: @model.id ? (new Date()).getTime(),
        create_sub_comment: container.data("user-create-subcomment"),
        readOnly: @readOnly
      )
      @template(templateData)

    render: ->
      @$el.addClass("response_" + @model.get("id"))
      @$el.html(@renderTemplate())
      @delegateEvents()

      @renderShowView()
      @renderAttrs()
      if @model.get("thread").get("closed")
        @hideCommentForm()

      @renderComments()
      @

    afterInsert: ->
      @makeWmdEditor "comment-body"
      @hideEditorChrome()

    hideEditorChrome: ->
      @$('.wmd-button-row').hide()
      @$('.wmd-preview-container').hide()
      @$('.wmd-input').css({
        height: '35px',
        padding: '5px'
      })
      @$('.comment-post-control').hide()

    showEditorChrome: ->
      @$('.wmd-button-row').show()
      @$('.wmd-preview-container').show()
      @$('.comment-post-control').show()
      @$('.wmd-input').css({
        height: '125px',
        padding: '10px'
      })

    renderComments: ->
      comments = new Comments()
      @commentViews = []
      comments.comparator = (comment) ->
        comment.get('created_at')
      collectComments = (comment) ->
        comments.add(comment)
        children = new Comments(comment.get('children'))
        children.each (child) ->
          child.parent = comment
          collectComments(child)
      @model.get('comments').each collectComments
      comments.each (comment) => @renderComment(comment, false, null)
      if @collapseComments && comments.length
        @$(".comments").hide()
        @$(".action-show-comments").on("click", (event) =>
          event.preventDefault()
          @$(".action-show-comments").hide()
          @$(".comments").show()
        )
      else
        @$(".action-show-comments").hide()

    renderComment: (comment) =>
      comment.set('thread', @model.get('thread'))
      view = new ResponseCommentView(model: comment)
      view.render()
      if @readOnly
        @$el.find('.comments').append(view.el)
      else
        @$el.find(".comments .new-comment").before(view.el)
      view.bind "comment:edit", (event) =>
        @cancelEdit(event) if @editView?
        @cancelCommentEdits()
        @hideCommentForm()
      view.bind "comment:cancel_edit", () => @showCommentForm()
      @commentViews.push(view)
      view

    submitComment: (event) ->
      event.preventDefault()
      url = @model.urlFor('reply')
      body = @getWmdContent("comment-body")
      return if not body.trim().length
      @setWmdContent("comment-body", "")
      comment = new Comment(body: body, created_at: (new Date()).toISOString(), username: window.user.get("username"), abuse_flaggers:[], user_id: window.user.get("id"), id:"unsaved")
      view = @renderComment(comment)
      @hideEditorChrome()
      @trigger "comment:add", comment

      DiscussionUtil.safeAjax
        $elem: $(event.target)
        url: url
        type: "POST"
        dataType: 'json'
        data:
          body: body
        success: (response, textStatus) ->
          comment.set(response.content)
          comment.updateInfo(response.annotated_content_info)
          view.render() # This is just to update the id for the most part, but might be useful in general

    _delete: (event) =>
      event.preventDefault()
      if not @model.can('can_delete')
        return
      if not confirm gettext("Are you sure you want to delete this response?")
        return
      url = @model.urlFor('_delete')
      @model.remove()
      @$el.remove()
      $elem = $(event.target)
      DiscussionUtil.safeAjax
        $elem: $elem
        url: url
        type: "POST"
        success: (response, textStatus) =>

    createEditView: () ->
      if @showView?
        @showView.$el.empty()

      if @editView?
        @editView.model = @model
      else
        @editView = new ThreadResponseEditView(model: @model)
        @editView.bind "response:update", @update
        @editView.bind "response:cancel_edit", @cancelEdit

    renderSubView: (view) ->
      view.setElement(@$('.discussion-response'))
      view.render()
      view.delegateEvents()

    renderEditView: () ->
      @renderSubView(@editView)

    cancelCommentEdits: () ->
      _.each(@commentViews, (view) -> view.cancelEdit())

    hideCommentForm: () ->
      @$('.comment-form').closest('li').hide()

    showCommentForm: () ->
      @$('.comment-form').closest('li').show()

    createShowView: () ->

      if @editView?
        @editView.$el.empty()

      if @showView?
        @showView.model = @model
      else
        @showView = new ThreadResponseShowView(model: @model)
        @showView.bind "response:_delete", @_delete
        @showView.bind "response:edit", @edit
        @showView.on "comment:endorse", => @trigger("comment:endorse")

    renderShowView: () ->
      @renderSubView(@showView)

    cancelEdit: (event) =>
      event.preventDefault()
      @createShowView()
      @renderShowView()
      @showCommentForm()

    edit: (event) =>
      @createEditView()
      @renderEditView()
      @cancelCommentEdits()
      @hideCommentForm()

    update: (event) =>

      newBody  = @editView.$(".edit-post-body textarea").val()

      url = DiscussionUtil.urlFor('update_comment', @model.id)

      DiscussionUtil.safeAjax
          $elem: $(event.target)
          $loading: $(event.target) if event
          url: url
          type: "POST"
          dataType: 'json'
          data:
              body: newBody
          error: DiscussionUtil.formErrorHandler(@$(".edit-post-form-errors"))
          success: (response, textStatus) =>
              @editView.$(".edit-post-body textarea").val("").attr("prev-text", "")
              @editView.$(".wmd-preview p").html("")

              @model.set
                body: newBody

              @createShowView()
              @renderShowView()
              @showCommentForm()

