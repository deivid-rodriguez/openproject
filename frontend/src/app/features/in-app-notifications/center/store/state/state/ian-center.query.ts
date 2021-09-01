import { Query } from '@datorama/akita';
import {
  IanCenterState,
  IanCenterStore,
} from 'core-app/features/in-app-notifications/center/store/state/state/ian-center.store';
import { InAppNotificationsService } from 'core-app/core/global-store/in-app-notifications/in-app-notifications.service';

export class IanCenterQuery extends Query<IanCenterState> {
  constructor(
    protected store:IanCenterStore,
    protected ianService:InAppNotificationsService,
  ) {
    super(store);
  }
}