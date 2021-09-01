import { Injectable } from '@angular/core';
import {
  IAN_FACET_FILTERS,
  IanCenterStore,
  InAppNotificationFacet,
} from './ian-center.store';
import {
  map,
  switchMap,
  take,
} from 'rxjs/operators';
import { Actions } from '@datorama/akita-ng-effects';
import {
  selectCollection$,
  selectCollectionEntities$,
} from 'core-app/core/global-store/collection-store.type';
import { InAppNotificationsService } from 'core-app/core/global-store/in-app-notifications/in-app-notifications.service';
import { markNotificationsAsRead } from 'core-app/core/global-store/in-app-notifications/in-app-notifications.actions';
import { InAppNotification } from 'core-app/core/global-store/in-app-notifications/in-app-notification.model';
import { IanCenterQuery } from 'core-app/features/in-app-notifications/center/store/state/state/ian-center.query';
import { ID } from '@datorama/akita';

@Injectable()
export class IanCenterService {
  readonly id = 'ian-center';

  readonly store = new IanCenterStore();

  readonly query = new IanCenterQuery(this.store, this.ianService);

  activeFacet$ = this.query.select('activeFacet');

  notLoaded$ = this.query.select('notLoaded');

  selectCollection$ = this
    .query
    .select('params')
    .pipe(
      switchMap((params) => selectCollection$(this.ianService, params)),
    );

  selectNotifications$ = this
    .query
    .select('params')
    .pipe(
      switchMap((params) => selectCollectionEntities$<InAppNotification>(this.ianService, params)),
    );

  aggregatedCenterNotifications$ = this
    .selectNotifications$
    .pipe(
      map((notifications) => (
        _.groupBy(notifications, (notification) => notification._links.resource?.href || 'none')
      )),
    );

  constructor(
    private ianService:InAppNotificationsService,
    private actions$:Actions,
  ) {
  }

  setFacet(facet:InAppNotificationFacet):void {
    this.store.update({ activeFacet: facet });
    this.ianService.fetchNotifications({ ...this.store.getValue().params, filters: IAN_FACET_FILTERS[facet] });
  }

  markAsRead(notifications:ID[]) {
    this.actions$.dispatch(
      markNotificationsAsRead({ caller: this, notifications }),
    );
  }

  markAllAsRead():void {
    selectCollection$(this.ianService, this.store.getValue().params)
      .pipe(
        take(1),
      )
      .subscribe((collection) => {
        this.markAsRead(collection.ids);
      });
  }
}
