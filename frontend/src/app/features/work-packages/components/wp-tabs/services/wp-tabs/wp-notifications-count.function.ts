import { Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorkPackageResource } from 'core-app/features/hal/resources/work-package-resource';
import { InAppNotificationsService } from 'core-app/features/in-app-notifications/store/in-app-notifications.service';

export function workPackageNotificationsCount(
  workPackage:WorkPackageResource,
  injector:Injector,
):Observable<number> {
  const ianService = injector.get(InAppNotificationsService);
  return ianService.query.facetedCount$('activity');
}
