import { Component, ChangeDetectionStrategy } from '@angular/core';
import { I18nService } from 'core-app/core/i18n/i18n.service';
import { Actions } from '@datorama/akita-ng-effects';
import { IanCenterService } from 'core-app/features/in-app-notifications/center/store/state/state/ian-center.service';

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
    private storeService:IanCenterService,
    private actions$:Actions,
  ) {
  }

  markAllRead():void {
    this.storeService.markAllAsRead();
  }
}
