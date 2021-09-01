import { Injectable } from '@angular/core';
import {
  catchError,
  publishReplay,
  tap,
} from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  applyTransaction,
  ID,
} from '@datorama/akita';
import { APIV3Service } from 'core-app/core/apiv3/api-v3.service';
import { NotificationsService } from 'core-app/shared/components/notifications/notifications.service';
import { HalResource } from 'core-app/features/hal/resources/hal-resource';
import { InAppNotificationsStore } from './in-app-notifications.store';
import { InAppNotification } from './in-app-notification.model';
import { IHALCollection } from 'core-app/core/apiv3/types/hal-collection.type';
import { HttpClient } from '@angular/common/http';
import { Actions } from '@datorama/akita-ng-effects';
import { InAppNotificationsQuery } from 'core-app/core/state/in-app-notifications/in-app-notifications.query';
import { Apiv3ListParameters } from 'core-app/core/apiv3/paths/apiv3-list-resource.interface';
import { collectionKey } from 'core-app/core/state/collection-store.type';

@Injectable({ providedIn: 'root' })
export class InAppNotificationsService {
  protected store = new InAppNotificationsStore();

  readonly query = new InAppNotificationsQuery(this.store);

  constructor(
    private http:HttpClient,
    private apiV3Service:APIV3Service,
    private notifications:NotificationsService,
    private actions$:Actions,
  ) {
  }

  fetchNotifications(params:Apiv3ListParameters):Observable<IHALCollection<InAppNotification>> {
    const collectionURL = collectionKey(params);

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

  markAsRead(notifications:ID[]):Observable<unknown> {
    return this
      .apiV3Service
      .notifications
      .markRead(notifications)
      .pipe(
        tap(() => {
          this.store.update(notifications, { readIAN: true });
        }),
      );
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
