;(function (define, undefined) {
    'use strict';
    define([
            'gettext', 'jquery', 'underscore', 'common/js/components/views/list', 'js/student_profile/views/badge_view',
            'text!templates/student_profile/badge_placeholder.underscore'],
        function (gettext, $, _, ListView, BadgeView, badgePlaceholder) {
            var BadgeListView = ListView.extend({
                tagName: 'div',
                template: _.template(badgePlaceholder),
                renderCollection: function () {
                    this.$el.empty();
                    var self = this;
                    var row;
                    // Split into two columns.
                    this.collection.each(function (badge, index) {
                        if (index % 2 === 0) {
                            row = $('<div class="row">');
                            this.$el.append(row);
                        }
                        var item = new BadgeView({
                            model: badge,
                            badgeMeta: this.badgeMeta,
                            ownProfile: this.ownProfile
                        }).render().el;
                        row.append(item);
                        this.itemViews.push(item);
                    }, this);
                    // Placeholder must always be at the end, and may need a new row.
                    if (!this.collection.hasNextPage()) {
                        // find_courses_url set by BadgeListContainer during initialization.
                        var placeholder = this.template({find_courses_url: self.find_courses_url});
                        if (this.collection.length % 2 === 0) {
                            row = $('<div class="row">');
                            this.$el.append(row);
                        }
                        row.append(placeholder);
                    }
                    return this;
                }
            });

            return BadgeListView;
        });
}).call(this, define || RequireJS.define);
