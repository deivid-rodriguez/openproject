import {
  createAction,
  props,
} from '@datorama/akita-ng-effects';
import { InAppNotificationFacet } from 'core-app/features/in-app-notifications/store/in-app-notifications.store';
import { ApiV3ListFilter } from 'core-app/core/apiv3/paths/apiv3-list-resource.interface';
import { ID } from '@datorama/akita';

export const setNotificationCenterFacet = createAction(
  '[IAN] Set notification center facet',
  props<{ facet:InAppNotificationFacet }>(),
);

export const setNotificationFilters = createAction(
  '[IAN] Set notification filters',
  props<{ store:'center'|'activity', filters:ApiV3ListFilter[] }>(),
);

export const markNotificationsAsRead = createAction(
  '[IAN] Mark notificationsAsRead',
  props<{ store:'center'|'activity', notifications:ID[] }>(),
);

export const triggerNotificationReload = createAction(
  '[IAN] Trigger notification refresh',
  props<{ causedBy:'center'|'activity' }>(),
);
