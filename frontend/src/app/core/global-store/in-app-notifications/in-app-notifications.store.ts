import { EntityStore, StoreConfig } from '@datorama/akita';
import { InAppNotification } from './in-app-notification.model';
import { CollectionState, createInitialCollectionState } from 'core-app/core/global-store/collection-store.type';

export interface InAppNotificationsState extends CollectionState<InAppNotification> {
}

@StoreConfig({ name: 'in-app-notifications' })
export class InAppNotificationsStore extends EntityStore<InAppNotificationsState> {
  constructor() {
    super(createInitialCollectionState());
  }
}
