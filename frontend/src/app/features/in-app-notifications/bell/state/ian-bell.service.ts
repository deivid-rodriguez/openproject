import {
  Injectable,
  Injector,
} from '@angular/core';
import { IanBellStore } from './ian-bell.store';
import { InAppNotificationsService } from 'core-app/core/state/in-app-notifications/in-app-notifications.service';
import { IAN_FACET_FILTERS } from 'core-app/features/in-app-notifications/center/state/ian-center.store';
import {
  map,
  tap,
} from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IanBellQuery } from 'core-app/features/in-app-notifications/bell/state/ian-bell.query';
import {
  EffectCallback,
  EffectHandler,
} from 'core-app/core/state/effects/effect-handler.decorator';
import { markNotificationsAsRead } from 'core-app/core/state/in-app-notifications/in-app-notifications.actions';
import { UntilDestroyedMixin } from 'core-app/shared/helpers/angular/until-destroyed.mixin';

@Injectable()
@EffectHandler
export class IanBellService extends UntilDestroyedMixin {
  readonly id = 'ian-center';

  readonly store = new IanBellStore();

  readonly query = new IanBellQuery(this.store);

  unread$ = this.query.select('totalUnread');

  constructor(
    readonly injector:Injector,
    readonly ianService:InAppNotificationsService,
  ) {
    super();
  }

  fetchUnread():Observable<number> {
    return this.ianService
      .fetchNotifications({ filters: IAN_FACET_FILTERS.unread, pageSize: 0 })
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

  @EffectCallback(markNotificationsAsRead)
  private reloadOnNotificationRead(action:ReturnType<typeof markNotificationsAsRead>) {
    this.markRead(action.notifications.length);
  }
}
