//-- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
//++
/* globals URI */

module.exports = function(
  HALAPIResource,
  $http,
  $q,
  $filter,
  I18n,
  NotificationsService
  ) {
  var ActivityService = {
    createComment: function(workPackage, comment) {
      return $http({
        url: workPackage.links.addComment.url(),
        method: 'POST',
        data: JSON.stringify({ comment: comment }),
        headers: { 'Content-Type': 'application/json; charset=UTF-8' }
      });
    },

    updateComment: function(activity, comment) {
      var options = {
        ajax: {
          method: 'PATCH',
          data: JSON.stringify({ comment: comment }),
          contentType: "application/json; charset=utf-8"
        }
      };

      return activity.links.update.fetch(options).then(function(activity){
        NotificationsService.addSuccess(
          I18n.t('js.work_packages.comment_updated')
        );
        return activity;
      });
    },

    // Handle asynchronous loading and interlacing of activities.
    // Does not add any intermittent result to the scope,
    // as we will get an inconsistent activity view.
    // As we may not what activities will be added at a given time,
    // let them be aggregated asynchronously.
    getAggregatedActivities: function(workPackage, sortedInDescendingOrder) {
      function addDisplayedActivities() {
        return $q(function(resolve) {
          workPackage.links.activities.fetch().then(function(data) {
            resolve(data.embedded.elements);
          });
        });
      }

      function addDisplayedRevisions() {
        return $q(function(resolve) {
          var linkedRevisions = workPackage.links.revisions;

          if (linkedRevisions === undefined) {
            resolve();
          }

          linkedRevisions
            .fetch()
            .then(function(data) {
              resolve(data.embedded.elements)
            });
        });
      }

      return $q(function(resolve) {
        $q.all([addDisplayedActivities(), addDisplayedRevisions()]).then(function(aggregated) {
          resolve($filter('orderBy')(_.flatten(aggregated),
            'props.createdAt',
            sortedInDescendingOrder
          ));
        });
      });
    },

    isInitialActivity: function(activities, activity, activityNo, activitiesSortedInDescendingOrder) {
      var type = activity.props._type;


      // Type must be Activity
      if (type.indexOf('Activity') !== 0) {
        return false;
      }

      // Shortcut, activityNo is 1 and its an Activity
      if (activityNo === 1) {
        return true;
      }

      // Otherwise, the current acitity may be initial if ALL other preceding activites are
      // other types.
      while (--activityNo > 0) {
        var index = (activitiesSortedInDescendingOrder ?
                      activities.length - activityNo : activityNo - 1);

        if (activities[index].props._type.indexOf('Activity') === 0) {
          return false;
        }
      }

      return true;
    }
  };

  return ActivityService;
};
