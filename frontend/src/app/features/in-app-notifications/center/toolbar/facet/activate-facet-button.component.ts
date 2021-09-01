import { ChangeDetectionStrategy, Component } from '@angular/core';
import { I18nService } from 'core-app/core/i18n/i18n.service';
import { InAppNotificationsQuery } from 'core-app/features/in-app-notifications/store/in-app-notifications.query';
import { InAppNotificationsService } from 'core-app/features/in-app-notifications/store/in-app-notifications.service';
import {
  IAN_FACET_FILTERS,
  InAppNotificationFacet,
  InAppNotificationsStore,
} from 'core-app/features/in-app-notifications/store/in-app-notifications.store';
import { Actions } from '@datorama/akita-ng-effects';
import { setNotificationCenterFacet } from 'core-app/features/in-app-notifications/store/in-app-notifications.actions';

@Component({
  selector: 'op-activate-facet',
  templateUrl: './activate-facet-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivateFacetButtonComponent {
  text = {
    facets: {
      unread: this.I18n.t('js.notifications.facets.unread'),
      all: this.I18n.t('js.notifications.facets.all'),
    },
  };

  availableFacets = Object.keys(IAN_FACET_FILTERS);

  activeFacet$ = this
    .ianQuery
    .select((state) => state.center?.activeFacet);

  constructor(
    private I18n:I18nService,
    private ianStore:InAppNotificationsStore,
    private ianQuery:InAppNotificationsQuery,
    private actions$:Actions,
  ) {
  }

  activateFacet(facet:InAppNotificationFacet):void {
    this
      .actions$
      .dispatch(setNotificationCenterFacet({ facet }));
  }
}
