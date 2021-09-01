import { Injectable } from '@angular/core';
import { IanBellStore } from './ian-bell.store';
import { InAppNotificationsService } from 'core-app/core/global-store/in-app-notifications/in-app-notifications.service';
import { IAN_FACET_FILTERS } from 'core-app/features/in-app-notifications/center/store/state/state/ian-center.store';
import {
  map,
  tap,
} from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IanBellQuery } from 'core-app/features/in-app-notifications/bell/state/ian-bell.query';

@Injectable()
export class IanBellService {
  readonly id = 'ian-center';

  readonly store = new IanBellStore();

  readonly query = new IanBellQuery(this.store);

  unread$ = this.query.select('totalUnread');

  constructor(
    private ianService:InAppNotificationsService,
  ) {
  }

  fetchUnread():Observable<number> {
    return this.ianService
      .fetchNotifications({ filters: IAN_FACET_FILTERS.unread })
      .pipe(
        map((result) => result.total),
        tap((count) => {
          this.store.update({ totalUnread: count });
        }),
      );
  }

  markRead(count:number):void {
    this.store.update(({ totalUnread }) => ({ totalUnread: totalUnread - count }));
  }
}
