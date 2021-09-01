import { Injectable } from '@angular/core';
import {
  switchMap,
  take,
  tap,
  catchError,
} from 'rxjs/operators';
import { Subscription, Observable } from 'rxjs';
import { applyTransaction, ID, setLoading } from '@datorama/akita';
import { APIV3Service } from 'core-app/core/apiv3/api-v3.service';
import { NotificationsService } from 'core-app/shared/components/notifications/notifications.service';
import { InAppNotificationsQuery } from 'core-app/features/in-app-notifications/store/in-app-notifications.query';
import { HalResource } from 'core-app/features/hal/resources/hal-resource';
import { InAppNotificationsStore } from './in-app-notifications.store';
import { InAppNotification } from './in-app-notification.model';
import { IHALCollection } from 'core-app/core/apiv3/types/hal-collection.type';
import { HttpClient } from '@angular/common/http';
import { markNotificationsAsRead } from 'core-app/features/in-app-notifications/store/in-app-notifications.actions';
import { Actions } from '@datorama/akita-ng-effects';

@Injectable({ providedIn: 'root' })
export class InAppNotificationsService {
  constructor(
    private store:InAppNotificationsStore,
    public query:InAppNotificationsQuery,
    private http:HttpClient,
    private apiV3Service:APIV3Service,
    private notifications:NotificationsService,
    private actions$:Actions,
  ) {
  }

  fetchNotifications(collectionURL:string):Observable<IHALCollection<InAppNotification>> {
    return this
      .http
      .get<IHALCollection<InAppNotification>>(this.notificationsPath + collectionURL)
      .pipe(
        tap((events) => {
          applyTransaction(() => {
            this.store.add(events._embedded.elements);
            this.store.update(({ collections }) => (
              {
                collections: {
                  ...collections,
                  [collectionURL]: {
                    ids: events._embedded.elements.map((el) => el.id),
                  },
                },
              }
            ));
          });
        }),
        catchError((error) => {
          this.notifications.addError(error);
          throw error;
        }),
      );
  }

  update(id:ID, inAppNotification:Partial<InAppNotification>):void {
    this.store.update(id, inAppNotification);
  }

  markAllAsRead(store:'activity'|'center') {
    this
      .query
      .collection$(store)
      .pipe(
        take(1),
      )
      .subscribe((collection) => {
        this.actions$.dispatch(
          markNotificationsAsRead({ store, notifications: collection.ids }),
        );
      });
  }

  private get notificationsPath():string {
    return this
      .apiV3Service
      .notifications
      .path;
  }

  private sideLoadInvolvedWorkPackages(elements:InAppNotification[]):void {
    const wpIds = elements.map((element) => {
      const href = element._links.resource?.href;
      return href && HalResource.matchFromLink(href, 'work_packages');
    });

    void this
      .apiV3Service
      .work_packages
      .requireAll(_.compact(wpIds));
  }
}
