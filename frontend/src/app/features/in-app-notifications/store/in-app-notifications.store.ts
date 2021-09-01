import { Injectable } from '@angular/core';
import {
  EntityState,
  EntityStore,
  ID,
  StoreConfig,
} from '@datorama/akita';
import {
  InAppNotification,
} from './in-app-notification.model';
import {
  ApiV3ListFilter, Apiv3ListParameters,
  listParamsString,
} from 'core-app/core/apiv3/paths/apiv3-list-resource.interface';

export interface InAppNotificationsSidebarState {
  reasons:Record<string, number>;
  projects:Record<string, number>;
}

export interface InAppNotificationsCollectionState {
  pageSize:number;
  currentPage:number;
  activeFacet:InAppNotificationFacet;
  filters:ApiV3ListFilter[];
}

export interface InAppNotificationsCenterState extends InAppNotificationsCollectionState {
  /** Number of elements not showing after max values loaded */
  notLoaded:number;
}

export interface CollectionResponse {
  ids:ID[];
}

export interface InAppNotificationsState extends EntityState<InAppNotification> {
  /** Total number of unread notifications */
  totalUnread:number;
  /** With the sidebar open, sidebar details */
  sidebar?:InAppNotificationsSidebarState;

  /** With the center open, center details */
  center?:InAppNotificationsCenterState;

  /** With an activity view open, shows details */
  activity?:InAppNotificationsCollectionState;

  /** Loaded notification collections */
  collections:Record<string, CollectionResponse>;
}

export type InAppNotificationFacet = 'unread'|'all';

export const IAN_FACET_FILTERS:Record<InAppNotificationFacet, ApiV3ListFilter[]> = {
  unread: [['readIAN', '=', false]],
  all: [],
};

export function createInitialState():InAppNotificationsState {
  return {
    totalUnread: 0,
    notLoaded: 0,
    collections: {},
  };
}

/**
 * Returns the collection key for the given filters
 * @param params list params
 */
export function notificationCollection(params:Apiv3ListParameters):string {
  return listParamsString(params);
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'in-app-notifications' })
export class InAppNotificationsStore extends EntityStore<InAppNotificationsState> {
  constructor() {
    super(createInitialState());
  }
}
