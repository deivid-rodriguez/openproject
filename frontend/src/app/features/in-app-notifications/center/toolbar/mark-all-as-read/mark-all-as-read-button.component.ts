import { Component, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from 'core-app/core/i18n/i18n.service';
import { InAppNotificationsService } from 'core-app/features/in-app-notifications/store/in-app-notifications.service';
import { Actions } from '@datorama/akita-ng-effects';
import { markNotificationsAsRead } from 'core-app/features/in-app-notifications/store/in-app-notifications.actions';
import { take } from 'rxjs/internal/operators/take';

@Component({
  selector: 'op-mark-all-as-read-button',
  templateUrl: './mark-all-as-read-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkAllAsReadButtonComponent {
  text = {
    mark_all_read: this.I18n.t('js.notifications.center.mark_all_read'),

  };

  constructor(
    private I18n:I18nService,
    private ianService:InAppNotificationsService,
    private actions$:Actions,
  ) {
  }

  markAllRead():void {
    // was ist meine aktuelle Collection von center?
    this.ianService.markAllAsRead('center');
  }
}
