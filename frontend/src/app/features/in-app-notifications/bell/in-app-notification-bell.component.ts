import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { InAppNotificationsQuery } from 'core-app/features/in-app-notifications/store/in-app-notifications.query';
import {
  InAppNotificationsStore,
  notificationCollection
} from 'core-app/features/in-app-notifications/store/in-app-notifications.store';
import { InAppNotificationsService } from 'core-app/features/in-app-notifications/store/in-app-notifications.service';
import { OpModalService } from 'core-app/shared/components/modal/modal.service';
import { timer, combineLatest } from 'rxjs';
import {
  filter,
  switchMap,
  map,
  tap,
} from 'rxjs/operators';
import { ActiveWindowService } from 'core-app/core/active-window/active-window.service';
import { PathHelperService } from 'core-app/core/path-helper/path-helper.service';
import { APIV3Service } from 'core-app/core/apiv3/api-v3.service';
import { ApiV3ListFilter } from 'core-app/core/apiv3/paths/apiv3-list-resource.interface';
import { Actions } from '@datorama/akita-ng-effects';
import { setNotificationCenterFacet } from 'core-app/features/in-app-notifications/store/in-app-notifications.actions';

export const opInAppNotificationBellSelector = 'op-in-app-notification-bell';
const POLLING_INTERVAL = 10000;

@Component({
  selector: opInAppNotificationBellSelector,
  templateUrl: './in-app-notification-bell.component.html',
  styleUrls: ['./in-app-notification-bell.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InAppNotificationBellComponent {
  polling$ = timer(10, POLLING_INTERVAL).pipe(
    filter(() => this.activeWindow.isActive),
    switchMap(() => this.fetchNotifications()),
  );

  unreadCount$ = combineLatest([
    this.inAppQuery.unreadCount$,
    this.polling$,
  ]).pipe(map(([count]) => count));

  constructor(
    readonly inAppStore:InAppNotificationsStore,
    readonly inAppQuery:InAppNotificationsQuery,
    readonly inAppService:InAppNotificationsService,
    readonly actions$:Actions,
    readonly apiV3Service:APIV3Service,
    readonly activeWindow:ActiveWindowService,
    readonly modalService:OpModalService,
    readonly pathHelper:PathHelperService,
  ) { }

  notificationsPath():string {
    return this.pathHelper.notificationsPath();
  }

  private fetchNotifications() {
    const unreadFilter:ApiV3ListFilter = ['readIAN', '=', false];

    return this
      .inAppService
      .fetchNotifications(notificationCollection({ filters: [unreadFilter], pageSize: 0 }))
      .pipe(
        tap((result) => {
          this.inAppStore.update({ totalUnread: result.total });
        }),
      );
  }
}
