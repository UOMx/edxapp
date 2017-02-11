define(["js/views/validation", "codemirror", "underscore", "jquery", "jquery.ui", "js/utils/date_utils", "js/models/uploads",
    "js/views/uploads", "js/views/license", "js/models/license",
    "common/js/components/views/feedback_notification", "jquery.timepicker", "date", "gettext"],
       function(ValidatingView, CodeMirror, _, $, ui, DateUtils, FileUploadModel,
                FileUploadDialog, LicenseView, LicenseModel, NotificationView,
                timepicker, date, gettext) {

var DetailsView = ValidatingView.extend({
    // Model class is CMS.Models.Settings.CourseDetails
    events : {
        "input input" : "updateModel",
        "input textarea" : "updateModel",
        // Leaving change in as fallback for older browsers
        "change input" : "updateModel",
        "change textarea" : "updateModel",
        "change select" : "updateModel",
        'click .remove-course-introduction-video' : "removeVideo",
        'focus #course-overview' : "codeMirrorize",
        'mouseover .timezone' : "updateTime",
        // would love to move to a general superclass, but event hashes don't inherit in backbone :-(
        'focus :input' : "inputFocus",
        'blur :input' : "inputUnfocus",
        'click .action-upload-image': "uploadImage"
    },

    initialize : function(options) {
        options = options || {};
        this.fileAnchorTemplate = _.template('<a href="<%= fullpath %>"> <i class="icon fa fa-file"></i><%= filename %></a>');
        // fill in fields
        this.$el.find("#course-language").val(this.model.get('language'));
        this.$el.find("#course-organization").val(this.model.get('org'));
        this.$el.find("#course-number").val(this.model.get('course_id'));
        this.$el.find("#course-name").val(this.model.get('run'));
        this.$el.find('.set-date').datepicker({ 'dateFormat': 'm/d/yy' });

        // Avoid showing broken image on mistyped/nonexistent image
        this.$el.find('img.course-image').error(function() {
            $(this).hide();
        });
        this.$el.find('img.course-image').load(function() {
            $(this).show();
        });

        this.listenTo(this.model, 'invalid', this.handleValidationError);
        this.listenTo(this.model, 'change', this.showNotificationBar);
        this.selectorToField = _.invert(this.fieldToSelectorMap);
        // handle license separately, to avoid reimplementing view logic
        this.licenseModel = new LicenseModel({"asString": this.model.get('license')});
        this.licenseView = new LicenseView({
            model: this.licenseModel,
            el: this.$("#course-license-selector").get(),
            showPreview: true
        });
        this.listenTo(this.licenseModel, 'change', this.handleLicenseChange);

        if (options.showMinGradeWarning || false) {
            new NotificationView.Warning({
                title: gettext("Course Credit Requirements"),
                message: gettext("The minimum grade for course credit is not set."),
                closeIcon: true
            }).show();
        }
    },

    render: function() {
        DateUtils.setupDatePicker('start_date', this);
        DateUtils.setupDatePicker('end_date', this);
        DateUtils.setupDatePicker('enrollment_start', this);
        DateUtils.setupDatePicker('enrollment_end', this);

        this.$el.find('#' + this.fieldToSelectorMap['overview']).val(this.model.get('overview'));
        this.codeMirrorize(null, $('#course-overview')[0]);

        this.$el.find('#' + this.fieldToSelectorMap['short_description']).val(this.model.get('short_description'));

        this.$el.find('.current-course-introduction-video iframe').attr('src', this.model.videosourceSample());
        this.$el.find('#' + this.fieldToSelectorMap['intro_video']).val(this.model.get('intro_video') || '');
        if (this.model.has('intro_video')) {
            this.$el.find('.remove-course-introduction-video').show();
        }
        else this.$el.find('.remove-course-introduction-video').hide();

        this.$el.find('#' + this.fieldToSelectorMap['effort']).val(this.model.get('effort'));

        var imageURL = this.model.get('course_image_asset_path');
        this.$el.find('#course-image-url').val(imageURL);
        this.$el.find('#course-image').attr('src', imageURL);

        var pre_requisite_courses = this.model.get('pre_requisite_courses');
        pre_requisite_courses = pre_requisite_courses.length > 0 ? pre_requisite_courses : '';
        this.$el.find('#' + this.fieldToSelectorMap['pre_requisite_courses']).val(pre_requisite_courses);

        if (this.model.get('entrance_exam_enabled') == 'true') {
            this.$('#' + this.fieldToSelectorMap['entrance_exam_enabled']).attr('checked', this.model.get('entrance_exam_enabled'));
            this.$('.div-grade-requirements').show();
        }
        else {
            this.$('#' + this.fieldToSelectorMap['entrance_exam_enabled']).removeAttr('checked');
            this.$('.div-grade-requirements').hide();
        }
        this.$('#' + this.fieldToSelectorMap['entrance_exam_minimum_score_pct']).val(this.model.get('entrance_exam_minimum_score_pct'));

        var selfPacedButton = this.$('#course-pace-self-paced'),
            instructorPacedButton = this.$('#course-pace-instructor-paced'),
            paceToggleTip = this.$('#course-pace-toggle-tip');
        (this.model.get('self_paced') ? selfPacedButton : instructorPacedButton).attr('checked', true);
        if (this.model.canTogglePace()) {
            selfPacedButton.removeAttr('disabled');
            instructorPacedButton.removeAttr('disabled');
            paceToggleTip.text('');
        }
        else {
            selfPacedButton.attr('disabled', true);
            instructorPacedButton.attr('disabled', true);
            paceToggleTip.text(gettext('Course pacing cannot be changed once a course has started.'));
        }

        this.licenseView.render()

        return this;
    },
    fieldToSelectorMap : {
        'language' : 'course-language',
        'start_date' : "course-start",
        'end_date' : 'course-end',
        'enrollment_start' : 'enrollment-start',
        'enrollment_end' : 'enrollment-end',
        'overview' : 'course-overview',
        'short_description' : 'course-short-description',
        'intro_video' : 'course-introduction-video',
        'effort' : "course-effort",
        'course_image_asset_path': 'course-image-url',
        'pre_requisite_courses': 'pre-requisite-course',
        'entrance_exam_enabled': 'entrance-exam-enabled',
        'entrance_exam_minimum_score_pct': 'entrance-exam-minimum-score-pct'
    },

    updateTime : function(e) {
        var now = new Date(),
            hours = now.getUTCHours(),
            minutes = now.getUTCMinutes(),
            currentTimeText = gettext('%(hours)s:%(minutes)s (current UTC time)');

        $(e.currentTarget).attr('title', interpolate(currentTimeText, {
            'hours': hours,
            'minutes': minutes
        }, true));
    },

    updateModel: function(event) {
        switch (event.currentTarget.id) {
        case 'course-language':
            this.setField(event);
            break;
        case 'course-image-url':
            this.setField(event);
            var url = $(event.currentTarget).val();
            var image_name = _.last(url.split('/'));
            this.model.set('course_image_name', image_name);
            // Wait to set the image src until the user stops typing
            clearTimeout(this.imageTimer);
            this.imageTimer = setTimeout(function() {
                $('#course-image').attr('src', $(event.currentTarget).val());
            }, 1000);
            break;
        case 'course-effort':
            this.setField(event);
            break;
        case 'entrance-exam-enabled':
            if($(event.currentTarget).is(":checked")){
                this.$('.div-grade-requirements').show();
            }else{
                this.$('.div-grade-requirements').hide();
            }
            this.setField(event);
            break;
        case 'entrance-exam-minimum-score-pct':
            // If the val is an empty string then update model with default value.
            if ($(event.currentTarget).val() === '') {
                this.model.set('entrance_exam_minimum_score_pct', this.model.defaults.entrance_exam_minimum_score_pct);
            }
            else {
                this.setField(event);
            }
            break;
        case 'course-short-description':
            this.setField(event);
            break;
        case 'pre-requisite-course':
            var value = $(event.currentTarget).val();
            value = value == "" ? [] : [value];
            this.model.set('pre_requisite_courses', value);
            break;
        // Don't make the user reload the page to check the Youtube ID.
        // Wait for a second to load the video, avoiding egregious AJAX calls.
        case 'course-introduction-video':
            this.clearValidationErrors();
            var previewsource = this.model.set_videosource($(event.currentTarget).val());
            clearTimeout(this.videoTimer);
            this.videoTimer = setTimeout(_.bind(function() {
                this.$el.find(".current-course-introduction-video iframe").attr("src", previewsource);
                if (this.model.has('intro_video')) {
                    this.$el.find('.remove-course-introduction-video').show();
                }
                else {
                    this.$el.find('.remove-course-introduction-video').hide();
                }
            }, this), 1000);
            break;
        case 'course-pace-self-paced':
            // Fallthrough to handle both radio buttons
        case 'course-pace-instructor-paced':
            this.model.set('self_paced', JSON.parse(event.currentTarget.value));
            break;
        default: // Everything else is handled by datepickers and CodeMirror.
            break;
        }
    },

    removeVideo: function(event) {
        event.preventDefault();
        if (this.model.has('intro_video')) {
            this.model.set_videosource(null);
            this.$el.find(".current-course-introduction-video iframe").attr("src", "");
            this.$el.find('#' + this.fieldToSelectorMap['intro_video']).val("");
            this.$el.find('.remove-course-introduction-video').hide();
        }
    },
    codeMirrors : {},
    codeMirrorize: function (e, forcedTarget) {
        var thisTarget;
        if (forcedTarget) {
            thisTarget = forcedTarget;
            thisTarget.id = $(thisTarget).attr('id');
        } else if (e !== null) {
            thisTarget = e.currentTarget;
        } else
        {
            // e and forcedTarget can be null so don't deference it
            // This is because in cases where we have a marketing site
            // we don't display the codeMirrors for editing the marketing
            // materials, except we do need to show the 'set course image'
            // workflow. So in this case e = forcedTarget = null.
            return;
        }

        if (!this.codeMirrors[thisTarget.id]) {
            var cachethis = this;
            var field = this.selectorToField[thisTarget.id];
            this.codeMirrors[thisTarget.id] = CodeMirror.fromTextArea(thisTarget, {
                mode: "text/html", lineNumbers: true, lineWrapping: true});
            this.codeMirrors[thisTarget.id].on('change', function (mirror) {
                    mirror.save();
                    cachethis.clearValidationErrors();
                    var newVal = mirror.getValue();
                    if (cachethis.model.get(field) != newVal) {
                        cachethis.setAndValidate(field, newVal);
                    }
            });
        }
    },

    revertView: function() {
        // Make sure that the CodeMirror instance has the correct
        // data from its corresponding textarea
        var self = this;
        this.model.fetch({
            success: function() {
                self.render();
                _.each(self.codeMirrors, function(mirror) {
                    var ele = mirror.getTextArea();
                    var field = self.selectorToField[ele.id];
                    mirror.setValue(self.model.get(field));
                });
                self.licenseModel.setFromString(self.model.get("license"), {silent: true});
                self.licenseView.render()
            },
            reset: true,
            silent: true});
    },
    setAndValidate: function(attr, value) {
        // If we call model.set() with {validate: true}, model fields
        // will not be set if validation fails. This puts the UI and
        // the model in an inconsistent state, and causes us to not
        // see the right validation errors the next time validate() is
        // called on the model. So we set *without* validating, then
        // call validate ourselves.
        this.model.set(attr, value);
        this.model.isValid();
    },

    showNotificationBar: function() {
        // We always call showNotificationBar with the same args, just
        // delegate to superclass
        ValidatingView.prototype.showNotificationBar.call(this,
                                                          this.save_message,
                                                          _.bind(this.saveView, this),
                                                          _.bind(this.revertView, this));
    },

    uploadImage: function(event) {
        event.preventDefault();
        var upload = new FileUploadModel({
            title: gettext("Upload your course image."),
            message: gettext("Files must be in JPEG or PNG format."),
            mimeTypes: ['image/jpeg', 'image/png']
        });
        var self = this;
        var modal = new FileUploadDialog({
            model: upload,
            onSuccess: function(response) {
                var options = {
                    'course_image_name': response.asset.display_name,
                    'course_image_asset_path': response.asset.url
                };
                self.model.set(options);
                self.render();
                $('#course-image').attr('src', self.model.get('course_image_asset_path'));
            }
        });
        modal.show();
    },

    handleLicenseChange: function() {
        this.showNotificationBar()
        this.model.set("license", this.licenseModel.toString())
    }
});

return DetailsView;

}); // end define()
