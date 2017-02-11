describe "DiscussionThreadView", ->
    beforeEach ->
        DiscussionSpecHelper.setUpGlobals()
        DiscussionSpecHelper.setUnderscoreFixtures()

        jasmine.Clock.useMock()
        @threadData = DiscussionViewSpecHelper.makeThreadWithProps({})
        @thread = new Thread(@threadData)
        @discussion = new Discussion(@thread)
        spyOn($, "ajax")
        # Avoid unnecessary boilerplate
        spyOn(DiscussionThreadShowView.prototype, "convertMath")
        spyOn(DiscussionContentView.prototype, "makeWmdEditor")
        spyOn(DiscussionUtil, "makeWmdEditor")
        spyOn(DiscussionUtil, "setWmdContent")
        spyOn(ThreadResponseShowView.prototype, "convertMath")

    renderWithContent = (view, content) ->
        $.ajax.andCallFake((params) =>
            params.success(
                createAjaxResponseJson(content, false),
                'success'
            )
            {always: ->}
        )
        view.render()
        jasmine.Clock.tick(100)

    renderWithTestResponses = (view, count, options) ->
        renderWithContent(
            view,
            _.extend(
                {
                    resp_total: count,
                    children: if count > 0 then (createTestResponseJson(index) for index in [1..count]) else []
                },
                options
            )
        )

    createTestResponseJson = (index) ->
        {
            user_id: window.user.id,
            body: "Response " + index,
            id: "id_" + index,
            created_at: "2015-01-01T22:20:28Z"
        }

    assertContentVisible = (view, selector, visible) ->
        content = view.$el.find(selector)
        expect(content.length).toBeGreaterThan(0)
        content.each (i, elem) ->
            expect($(elem).is(":visible")).toEqual(visible)

    assertExpandedContentVisible = (view, expanded) ->
        expect(view.$el.hasClass("expanded")).toEqual(expanded)
        assertContentVisible(view, ".post-extended-content", expanded)
        assertContentVisible(view, ".forum-thread-expand", not expanded)
        assertContentVisible(view, ".forum-thread-collapse", expanded)

    assertResponseCountAndPaginationCorrect = (view, countText, displayCountText, buttonText) ->
        expect(view.$el.find(".response-count").text()).toEqual(countText)
        if displayCountText
            expect(view.$el.find(".response-display-count").text()).toEqual(displayCountText)
        else
            expect(view.$el.find(".response-display-count").length).toEqual(0)
        if buttonText
            expect(view.$el.find(".load-response-button").text()).toEqual(buttonText)
        else
            expect(view.$el.find(".load-response-button").length).toEqual(0)

    createAjaxResponseJson = (content, can_act) ->
        {
            content: content,
            annotated_content_info: {
                ability: {
                    editable: can_act,
                    can_delete: can_act,
                    can_reply: can_act,
                    can_vote: can_act
                }
            }
        }

    postResponse = (view, index) ->
        testResponseJson = createTestResponseJson(index)
        responseText = testResponseJson.body
        spyOn(view, "getWmdContent").andReturn(responseText)
        $.ajax.andCallFake((params) =>
            expect(params.type).toEqual("POST")
            expect(params.data.body).toEqual(responseText)
            params.success(
                createAjaxResponseJson(testResponseJson, true),
                'success'
            )
            {always: ->}
        )
        view.$(".discussion-submit-post").click()

    describe "closed and open Threads", ->

        createDiscussionThreadView = (originallyClosed, mode) ->
            threadData = DiscussionViewSpecHelper.makeThreadWithProps({closed: originallyClosed})
            thread = new Thread(threadData)
            discussion = new Discussion(thread)
            view = new DiscussionThreadView(
                model: thread
                el: $("#fixture-element")
                mode: mode
                course_settings: DiscussionSpecHelper.makeCourseSettings()
            )
            renderWithTestResponses(view, 1)
            if mode == "inline"
                view.expand()
            spyOn(DiscussionUtil, "updateWithUndo").andCallFake(
                (model, updates, safeAjaxParams, errorMsg) ->
                    model.set(updates)
            )
            view

        checkCommentForm = (originallyClosed, mode) ->
            view = createDiscussionThreadView(originallyClosed, mode)
            expect(view.$('.comment-form').closest('li').is(":visible")).toBe(not originallyClosed)
            expect(view.$(".discussion-reply-new").is(":visible")).toBe(not originallyClosed)
            view.$(".action-close").click()
            expect(view.$('.comment-form').closest('li').is(":visible")).toBe(originallyClosed)
            expect(view.$(".discussion-reply-new").is(":visible")).toBe(originallyClosed)

        checkVoteDisplay = (originallyClosed, mode) ->
            view = createDiscussionThreadView(originallyClosed, mode)
            expect(view.$('.forum-thread-main-wrapper .action-vote').is(":visible")).toBe(not originallyClosed)
            expect(view.$('.forum-thread-main-wrapper .display-vote').is(":visible")).toBe(originallyClosed)
            view.$(".action-close").click()
            expect(view.$('.action-vote').is(":visible")).toBe(originallyClosed)
            expect(view.$('.display-vote').is(":visible")).toBe(not originallyClosed)

        _.each(["tab", "inline"], (mode) =>
            it "Test that in #{mode} mode when a closed thread is opened the comment form is displayed", ->
                checkCommentForm(true, mode)

            it "Test that in #{mode} mode when a open thread is closed the comment form is hidden", ->
                checkCommentForm(false, mode)

            it "Test that in #{mode} mode when a closed thread is opened the vote button is displayed and vote count is hidden", ->
                checkVoteDisplay(true, mode)

            it "Test that in #{mode} mode when a open thread is closed the vote button is hidden and vote count is displayed", ->
                checkVoteDisplay(false, mode)
        )

    describe "tab mode", ->
        beforeEach ->
            @view = new DiscussionThreadView(
                model: @thread
                el: $("#fixture-element")
                mode: "tab"
                course_settings: DiscussionSpecHelper.makeCourseSettings()
            )

        describe "responses", ->
            it "can post a first response", ->
                # Initially render a test post (made by someone else) with zero responses
                renderWithTestResponses(@view, 0)
                postResponse(@view, 1)
                expect(@view.$(".forum-response").length).toBe(1)
                # At this point, there are 2 DiscussionContentViews, the main post and the response.
                # Each an .action-edit button, but only 1 (the response) should be available.
                expect(@view.$(".post-actions-list").find(".action-edit").parent(".is-hidden").length).toBe(1)
                expect(@view.$(".response-actions-list").find(".action-edit").parent().not(".is-hidden").length).toBe(1)

            it "can post a second response", ->
                # Initially render a test post (made by someone else) with a single response (made by the current learner)
                renderWithTestResponses(@view, 1)
                expect(@view.$(".forum-response").length).toBe(1)
                # Post should not be editable, response should be
                expect(@view.$(".post-actions-list").find(".action-edit").parent(".is-hidden").length).toBe(1)
                expect(@view.$(".response-actions-list").find(".action-edit").parent().not(".is-hidden").length).toBe(1)

                # Now make a second response. Prior to TNL-3788, a bug would hide the edit button for the first response
                postResponse(@view, 2)
                expect(@view.$(".forum-response").length).toBe(2)
                # Post should not be editable, responses should be
                expect(@view.$(".post-actions-list").find(".action-edit").parent(".is-hidden").length).toBe(1)
                expect(@view.$(".response-actions-list").find(".action-edit").parent().not(".is-hidden").length).toBe(2)

        describe "response count and pagination", ->
            it "correctly render for a thread with no responses", ->
                renderWithTestResponses(@view, 0)
                assertResponseCountAndPaginationCorrect(@view, "0 responses", null, null)

            it "correctly render for a thread with one response", ->
                renderWithTestResponses(@view, 1)
                assertResponseCountAndPaginationCorrect(@view, "1 response", "Showing all responses", null)

            it "correctly render for a thread with one additional page", ->
                renderWithTestResponses(@view, 1, {resp_total: 2})
                assertResponseCountAndPaginationCorrect(@view, "2 responses", "Showing first response", "Load all responses")

            it "correctly render for a thread with multiple additional pages", ->
                renderWithTestResponses(@view, 2, {resp_total: 111})
                assertResponseCountAndPaginationCorrect(@view, "111 responses", "Showing first 2 responses", "Load next 100 responses")

            describe "on clicking the load more button", ->
                beforeEach ->
                    renderWithTestResponses(@view, 1, {resp_total: 5})
                    assertResponseCountAndPaginationCorrect(@view, "5 responses", "Showing first response", "Load all responses")

                it "correctly re-render when all threads have loaded", ->
                    renderWithTestResponses(@view, 5, {resp_total: 5})
                    @view.$el.find(".load-response-button").click()
                    assertResponseCountAndPaginationCorrect(@view, "5 responses", "Showing all responses", null)

                it "correctly re-render when one page remains", ->
                    renderWithTestResponses(@view, 3, {resp_total: 42})
                    @view.$el.find(".load-response-button").click()
                    assertResponseCountAndPaginationCorrect(@view, "42 responses", "Showing first 3 responses", "Load all responses")

                it "correctly re-render when multiple pages remain", ->
                    renderWithTestResponses(@view, 3, {resp_total: 111})
                    @view.$el.find(".load-response-button").click()
                    assertResponseCountAndPaginationCorrect(@view, "111 responses", "Showing first 3 responses", "Load next 100 responses")

    describe "inline mode", ->
        beforeEach ->
            @view = new DiscussionThreadView(
                model: @thread
                el: $("#fixture-element")
                mode: "inline"
                course_settings: DiscussionSpecHelper.makeCourseSettings()
            )

        describe "render", ->
            it "shows content that should be visible when collapsed", ->
                @view.render()
                assertExpandedContentVisible(@view, false)

            it "does not render any responses by default", ->
                @view.render()
                expect($.ajax).not.toHaveBeenCalled()
                expect(@view.$el.find(".responses li").length).toEqual(0)

        describe "focus", ->
            it "sends focus to the conversation when opened", ->
                DiscussionViewSpecHelper.setNextResponseContent({resp_total: 0, children: []})
                @view.render()
                @view.expand()
                waitsFor (->
                    # This is the implementation of "toBeFocused". However, simply calling that method
                    # with no wait seems to be flaky.
                    article = @view.$el.find('.discussion-article')
                    return article[0] == article[0].ownerDocument.activeElement
                ), "conversation did not receive focus", 3000

        describe "expand/collapse", ->
            it "shows/hides appropriate content", ->
                DiscussionViewSpecHelper.setNextResponseContent({resp_total: 0, children: []})
                @view.render()
                @view.expand()
                assertExpandedContentVisible(@view, true)
                @view.collapse()
                assertExpandedContentVisible(@view, false)

            it "switches between the abbreviated and full body", ->
                DiscussionViewSpecHelper.setNextResponseContent({resp_total: 0, children: []})
                longBody = new Array(100).join("test ")
                expectedAbbreviation = DiscussionUtil.abbreviateString(longBody, 140)
                @thread.set("body", longBody)

                @view.render()
                expect($(".post-body").text()).toEqual(expectedAbbreviation)
                expect(DiscussionThreadShowView.prototype.convertMath).toHaveBeenCalled()
                DiscussionThreadShowView.prototype.convertMath.reset()

                @view.expand()
                expect($(".post-body").text()).toEqual(longBody)
                expect(DiscussionThreadShowView.prototype.convertMath).toHaveBeenCalled()
                DiscussionThreadShowView.prototype.convertMath.reset()

                @view.collapse()
                expect($(".post-body").text()).toEqual(expectedAbbreviation)
                expect(DiscussionThreadShowView.prototype.convertMath).toHaveBeenCalled()

            it "strips script tags appropriately", ->
                DiscussionViewSpecHelper.setNextResponseContent({resp_total: 0, children: []})
                longMaliciousBody = new Array(100).join("<script>alert('Until they think warm days will never cease');</script>\n")
                @thread.set("body", longMaliciousBody)
                maliciousAbbreviation = DiscussionUtil.abbreviateString(@thread.get('body'), 140)

                # The nodes' html should be different than the strings, but
                # their texts should be the same, indicating that they've been
                # properly escaped. To be safe, make sure the string "<script"
                # isn't present, either

                @view.render()
                expect($(".post-body").html()).not.toEqual(maliciousAbbreviation)
                expect($(".post-body").text()).toEqual(maliciousAbbreviation)
                expect($(".post-body").html()).not.toContain("<script")

                @view.expand()
                expect($(".post-body").html()).not.toEqual(longMaliciousBody)
                expect($(".post-body").text()).toEqual(longMaliciousBody)
                expect($(".post-body").html()).not.toContain("<script")

                @view.collapse()
                expect($(".post-body").html()).not.toEqual(maliciousAbbreviation)
                expect($(".post-body").text()).toEqual(maliciousAbbreviation)
                expect($(".post-body").html()).not.toContain("<script")

            it "re-renders the show view correctly when leaving the edit view", ->
                DiscussionViewSpecHelper.setNextResponseContent({resp_total: 0, children: []})
                @view.render()
                @view.expand()
                assertExpandedContentVisible(@view, true)
                @view.edit()
                assertContentVisible(@view, ".edit-post-body", true)
                expect(@view.$el.find(".post-actions-list").length).toBe(0)
                @view.closeEditView(DiscussionSpecHelper.makeEventSpy())
                expect(@view.$el.find(".edit-post-body").length).toBe(0)
                assertContentVisible(@view, ".post-actions-list", true)

    describe "for question threads", ->
        beforeEach ->
            @thread.set("thread_type", "question")
            @view = new DiscussionThreadView(
                model: @thread
                el: $("#fixture-element")
                mode: "tab"
                course_settings: DiscussionSpecHelper.makeCourseSettings()
            )

        generateContent = (idStart, idEnd) ->
            _.map(_.range(idStart, idEnd), (i) -> createTestResponseJson(i))

        renderTestCase = (view, numEndorsed, numNonEndorsed) ->
            renderWithContent(
                view,
                {
                    endorsed_responses: generateContent(0, numEndorsed),
                    non_endorsed_responses: generateContent(numEndorsed, numEndorsed + numNonEndorsed),
                    non_endorsed_resp_total: numNonEndorsed
                }
            )
            expect(view.$(".js-marked-answer-list .discussion-response").length).toEqual(numEndorsed)
            expect(view.$(".js-response-list .discussion-response").length).toEqual(numNonEndorsed)
            assertResponseCountAndPaginationCorrect(
                view,
                "#{numNonEndorsed} #{if numEndorsed then "other " else ""}#{if numNonEndorsed == 1 then "response" else "responses"}",
                if numNonEndorsed then "Showing all responses" else null,
                null
            )

        _.each({"no": 0, "one": 1, "many": 5}, (numEndorsed, endorsedDesc) ->
            _.each({"no": 0, "one": 1, "many": 5}, (numNonEndorsed, nonEndorsedDesc) ->
                it "renders correctly with #{endorsedDesc} marked answer(s) and #{nonEndorsedDesc} response(s)", ->
                    renderTestCase(@view, numEndorsed, numNonEndorsed)
            )
        )

        it "handles pagination correctly", ->
            renderWithContent(
                @view,
                {
                    endorsed_responses: generateContent(0, 2),
                    non_endorsed_responses: generateContent(3, 6),
                    non_endorsed_resp_total: 42
                }
            )
            DiscussionViewSpecHelper.setNextResponseContent({
                # Add an endorsed response; it should be rendered
                endorsed_responses: generateContent(0, 3),
                non_endorsed_responses: generateContent(6, 9),
                non_endorsed_resp_total: 41
            })
            @view.$el.find(".load-response-button").click()
            expect($(".js-marked-answer-list .discussion-response").length).toEqual(3)
            expect($(".js-response-list .discussion-response").length).toEqual(6)
            assertResponseCountAndPaginationCorrect(
                @view,
                "41 other responses",
                "Showing first 6 responses",
                "Load all responses"
            )
