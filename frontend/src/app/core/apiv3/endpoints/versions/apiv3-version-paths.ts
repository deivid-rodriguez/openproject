// -- copyright
// OpenProject is an open source project management software.
// Copyright (C) 2012-2021 the OpenProject GmbH
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See COPYRIGHT and LICENSE files for more details.
//++

import { VersionResource } from 'core-app/features/hal/resources/version-resource';
import { Observable } from 'rxjs';
import { CachableAPIV3Resource } from 'core-app/core/apiv3/cache/cachable-apiv3-resource';
import { tap } from 'rxjs/operators';
import { StateCacheService } from 'core-app/core/apiv3/cache/state-cache.service';

export class APIv3VersionPaths extends CachableAPIV3Resource<VersionResource> {
  /**
   * Update a version resource with the given payload
   *
   * @param resource
   * @param payload
   */
  public patch(payload:Object):Observable<VersionResource> {
    return this
      .halResourceService
      .patch<VersionResource>(
      this.path,
      payload,
    )
      .pipe(
        tap((version) => this.touch(version)),
      );
  }

  protected createCache():StateCacheService<VersionResource> {
    return new StateCacheService<VersionResource>(this.states.versions);
  }
}
