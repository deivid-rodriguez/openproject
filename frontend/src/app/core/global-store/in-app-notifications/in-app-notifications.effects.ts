import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@datorama/akita-ng-effects';
import { tap } from 'rxjs/operators';
import { InAppNotificationsService } from 'core-app/core/global-store/in-app-notifications/in-app-notifications.service';
import {
  markNotificationsAsRead,
  notificationsMarkedRead,
} from 'core-app/core/global-store/in-app-notifications/in-app-notifications.actions';

@Injectable()
export class InAppNotificationsEffects {
  constructor(
    private actions$:Actions,
    private ianService:InAppNotificationsService,
  ) {
  }

  /**
   * Mark the given notification IDs as read through the API.
   */
  @Effect({ dispatch: true })
  reloadOnNotificationRead$ = this.actions$.pipe(
    ofType(markNotificationsAsRead),
    tap((params) => {
      this
        .ianService
        .markAsRead(params.notifications)
        .subscribe(() => (
          this.actions$.dispatch(notificationsMarkedRead(params))
        ));
    }),
  );
}
