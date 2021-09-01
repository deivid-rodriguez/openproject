import { createAction, props } from '@datorama/akita-ng-effects';
import { InAppNotificationFacet } from 'core-app/features/in-app-notifications/center/store/state/state/ian-center.store';

export const ianCenterUpdateFacet = createAction(
  '[IAN] Set notification center facet',
  props<{ facet:InAppNotificationFacet }>(),
);
