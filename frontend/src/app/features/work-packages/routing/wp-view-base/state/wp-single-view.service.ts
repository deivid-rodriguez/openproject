import { Injectable } from '@angular/core';
import { WpSingleViewStore } from './wp-single-view.store';
import { WpSingleViewQuery } from 'core-app/features/work-packages/routing/wp-view-base/state/wp-single-view.query';
import {
  filter,
  map,
  switchMap,
  take,
} from 'rxjs/operators';
import {
  selectCollection$,
  selectCollectionEntities$,
} from 'core-app/core/global-store/collection-store.type';
import { InAppNotification } from 'core-app/core/global-store/in-app-notifications/in-app-notification.model';
import { InAppNotificationsService } from 'core-app/core/global-store/in-app-notifications/in-app-notifications.service';
import { ApiV3ListFilter } from 'core-app/core/apiv3/paths/apiv3-list-resource.interface';
import { markNotificationsAsRead } from 'core-app/core/global-store/in-app-notifications/in-app-notifications.actions';
import { Actions } from '@datorama/akita-ng-effects';

@Injectable()
export class WpSingleViewService {
  id = 'WorkPackage Activity Store';

  protected store = new WpSingleViewStore();

  readonly query = new WpSingleViewQuery(this.store);

  selectNotifications$ = this
    .query
    .select((state) => state.notifications.filters)
    .pipe(
      filter((filters) => filters.length > 0),
      switchMap((filters) => selectCollectionEntities$<InAppNotification>(this.ianService, { filters })),
    );

  selectNotificationsCount$ = this
    .selectNotifications$
    .pipe(
      map((notifications) => notifications.length),
    );

  hasNotifications$ = this
    .selectNotificationsCount$
    .pipe(
      map((count) => count > 0),
    );

  constructor(
    private ianService:InAppNotificationsService,
    private actions$:Actions,
  ) {
  }

  setFilters(workPackageId:string):void {
    const filters:ApiV3ListFilter[] = [
      ['readIAN', '=', false],
      ['resourceId', '=', [workPackageId]],
      ['resourceType', '=', ['WorkPackage']],
    ];

    this.store.update(({ notifications }) => (
      {
        notifications: {
          ...notifications,
          filters,
        },
      }
    ));

    this.ianService.fetchNotifications({ filters });
  }

  markAllAsRead():void {
    selectCollection$(this.ianService, { filters: this.store.getValue().notifications.filters })
      .pipe(
        take(1),
      )
      .subscribe((collection) => {
        this.actions$.dispatch(
          markNotificationsAsRead({ caller: this, notifications: collection.ids }),
        );
      });
  }
}
