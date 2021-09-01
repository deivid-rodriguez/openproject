import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@datorama/akita-ng-effects';
import {
  markNotificationsAsRead,
  setNotificationCenterFacet,
  setNotificationFilters,
  triggerNotificationReload,
} from 'core-app/features/in-app-notifications/store/in-app-notifications.actions';
import {
  IAN_FACET_FILTERS,
  InAppNotificationsState,
  InAppNotificationsStore,
  notificationCollection,
} from 'core-app/features/in-app-notifications/store/in-app-notifications.store';
import { InAppNotificationsService } from 'core-app/features/in-app-notifications/store/in-app-notifications.service';
import { map, tap } from 'rxjs/operators';
import { APIV3Service } from 'core-app/core/apiv3/api-v3.service';
import { take } from 'rxjs/internal/operators/take';
import { applyTransaction } from '@datorama/akita';
import { NOTIFICATIONS_MAX_SIZE } from 'core-app/features/in-app-notifications/store/in-app-notification.model';

@Injectable()
export class InAppNotificationsEffects {
  constructor(
    private actions$:Actions,
    private ianStore:InAppNotificationsStore,
    private ianService:InAppNotificationsService,
    private apiV3Service:APIV3Service,
  ) {
  }

  @Effect({ dispatch: true })
  updateFacet$ = this.actions$.pipe(
    ofType(setNotificationCenterFacet),
    tap((params) => {
      this.ianStore.update((state):InAppNotificationsState => (
        {
          ...state,
          center: {
            notLoaded: 0,
            pageSize: NOTIFICATIONS_MAX_SIZE,
            currentPage: 1,
            filters: [],
            ...state.center,
            activeFacet: params.facet,
          },
        }
      ));
    }),
    map((params) => (
      setNotificationFilters({ store: 'center', filters: IAN_FACET_FILTERS[params.facet] })
    )),
  );

  @Effect()
  reloadOnNotificationRead$ = this.actions$.pipe(
    ofType(markNotificationsAsRead),
    tap((params) => {
      this
        .apiV3Service
        .notifications
        .markRead(params.notifications)
        .subscribe(() => {
          applyTransaction(() => {
            // Mark the local notifications as read already
            this.ianStore.update(params.notifications, { readIAN: true });
            // Be clever about the bell and update immediately
            this.ianStore.update(({ totalUnread }) => totalUnread - params.notifications.length);
            this.actions$.dispatch(triggerNotificationReload({ causedBy: params.store }));
          });
        });
    }),
  );

  @Effect()
  triggerReload$ = this.actions$.pipe(
    ofType(triggerNotificationReload),
    tap((params) => {
      ['center', 'activity'].forEach((store:'center'|'activity') => {
        const section = this.ianStore.getValue()[store];
        if (store !== params.causedBy && section?.filters) {
          this
            .actions$
            .dispatch(setNotificationFilters({ store, filters: section.filters }));
        }
      });
    }),
  );

  @Effect()
  reloadFromUpdatedFilters$ = this.actions$.pipe(
    ofType(setNotificationFilters),
    tap((params) => {
      this.ianStore.update((state) => ({
        ...state,
        [params.store]: {
          ...state[params.store],
          filters: params.filters,
        },
      }));

      this
        .ianService
        .fetchNotifications(notificationCollection({ filters: params.filters }))
        .pipe(
          take(1),
        )
        .subscribe();
    }),
  );
}
