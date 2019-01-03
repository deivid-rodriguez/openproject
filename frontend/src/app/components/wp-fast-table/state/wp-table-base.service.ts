// -- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
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
// See doc/COPYRIGHT.rdoc for more details.
// ++

import {TableState} from 'core-components/wp-table/table-state/table-state';
import {InputState, State} from 'reactivestates';
import {mapTo, take, takeUntil} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {QueryResource} from 'core-app/modules/hal/resources/query-resource';
import {QuerySchemaResource} from 'core-app/modules/hal/resources/query-schema-resource';
import {WorkPackageCollectionResource} from 'core-app/modules/hal/resources/wp-collection-resource';
import {QueryFilterInstanceSchemaResource} from 'core-app/modules/hal/resources/query-filter-instance-schema-resource';

export abstract class WorkPackageTableBaseService<T> {

  constructor(readonly tableState:TableState) {
  }

  /**
   * Return the state this service cares for from the table state.
   *
   * This state cannot be updated externally.
   * @returns {State<T>}
   */
  public get state():State<T> {
    // Cast InputState down for external use.
    return this.inputState;
  }

  /**
   * Get the state value from the current query.
   *
   * @param {QueryResource} query
   * @returns {T} Instance of the state value for this type.
   */
  public abstract valueFromQuery(query:QueryResource, results:WorkPackageCollectionResource):T | undefined;

  /**
   * Initialize this table state from the given query resource,
   * and possibly the associated schema.
   *
   * Will only be performed in valueFromQuery is defined.
   *
   * @param {QueryResource} query
   * @param {QuerySchemaResource} schema
   */
  public initialize(query:QueryResource, results:WorkPackageCollectionResource, schema?:QuerySchemaResource) {
    const initial = this.valueFromQuery(query, results);

    if (initial !== undefined) {
      this.update(initial);
    }
  }

  public update(value:T) {
    this.inputState.putValue(value);
  }

  public clear(reason:string) {
    this.inputState.clear(reason);
  }

  public observeUntil(unsubscribe:Observable<any>) {
    return this.state.values$().pipe(takeUntil(unsubscribe));
  }

  public onReady() {
    return this.state.values$()
      .pipe(
        take(1),
        mapTo(null)
      )
      .toPromise();
  }

  /**
   * Return the state this service cares for from the table state.
   * This state can be internally updated.
   *
   * @returns {State<T>}
   */
  protected abstract get inputState():InputState<T>;
}

export interface WorkPackageQueryStateService {
  /**
   * Check whether the state value does not match the query resource's value.
   * @param query The current query resource
   */
  hasChanged(query:QueryResource):boolean;

  /**
   * Apply the current state value to query
   *
   * @return Whether the query should be visibly updated.
   */
  applyToQuery(query:QueryResource):boolean;

  state:State<any>;
}
