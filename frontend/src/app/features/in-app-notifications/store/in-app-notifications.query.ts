import { Injectable } from '@angular/core';
import { ID, QueryEntity } from '@datorama/akita';
import { filter, map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  CollectionResponse,
  InAppNotificationFacet,
  InAppNotificationsState,
  InAppNotificationsStore,
  notificationCollection,
} from './in-app-notifications.store';
import { InAppNotification } from 'core-app/features/in-app-notifications/store/in-app-notification.model';
import Collection = api.v3.Collection;

@Injectable({ providedIn: 'root' })
export class InAppNotificationsQuery extends QueryEntity<InAppNotificationsState> {
  aggregatedCenterNotifications$ = this
    .faceted$('center')
    .pipe(
      map((notifications) => (
        _.groupBy(notifications, (notification) => notification._links.resource?.href || 'none')
      )),
    );

  /** Get the number of unread items */
  unreadCount$ = this.select('totalUnread');

  constructor(protected store:InAppNotificationsStore) {
    super(store);
  }

  public activeFacet$(stream:'center'|'activity'):Observable<InAppNotificationFacet> {
    return this
      .select((state) => state[stream]?.activeFacet)
      .pipe(
        filter((facet:InAppNotificationFacet|undefined) => !!facet),
      ) as Observable<InAppNotificationFacet>;
  }

  public collection$(stream:'center'|'activity'):Observable<CollectionResponse> {
    return this
      .select((state) => {
        const filters = state[stream]?.filters;
        if (filters) {
          const collection = notificationCollection({ filters });
          return state?.collections[collection];
        }

        return undefined;
      })
      .pipe(
        filter((collection) => !!collection),
      ) as Observable<CollectionResponse>;
  }

  public faceted$(stream:'center'|'activity'):Observable<InAppNotification[]> {
    return this
      .collection$(stream)
      .pipe(
        switchMap((collection:CollectionResponse) => (
          this.selectAll({
            filterBy: ({ id }) => collection.ids.includes(id),
          })
        )),
      );
  }

  public facetedCount$(stream:'center'|'activity'):Observable<number> {
    return this
      .faceted$(stream)
      .pipe(
        map((elements) => elements.length),
      );
  }

  public hasFacetCount$(stream:'center'|'activity'):Observable<boolean> {
    return this
      .facetedCount$(stream)
      .pipe(
        map((count) => count > 0),
      );
  }
}
