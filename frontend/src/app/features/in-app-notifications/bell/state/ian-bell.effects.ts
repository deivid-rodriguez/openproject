import { Injectable } from '@angular/core';
import {
  Actions,
  Effect,
  ofType,
} from '@datorama/akita-ng-effects';
import { tap } from 'rxjs/operators';
import {
  markNotificationsAsRead,
} from 'core-app/core/global-store/in-app-notifications/in-app-notifications.actions';
import { IanBellService } from 'core-app/features/in-app-notifications/bell/state/ian-bell.service';

@Injectable()
export class IanBellEffects {
  constructor(
    private actions$:Actions,
    private storeService:IanBellService,
  ) {
  }

  /**
   * Mark the given notification IDs as read through the API.
   */
  @Effect()
  reloadOnNotificationRead$ = this.actions$.pipe(
    ofType(markNotificationsAsRead),
    tap((params) => {
      this.storeService.markRead(params.notifications.length);
    }),
  );
}
