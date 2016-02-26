//-- copyright
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
//++

import {ApiMetaDataService} from "../api-meta-data/api-meta-data.service";
import {ApiParamMappingService} from "../api-experimental/api-param-mapping.service";

export class ApiWorkPackagesService {
  protected WorkPackages;

  constructor (protected DEFAULT_PAGINATION_OPTIONS,
               protected $stateParams,
               protected $q:ng.IQService,
               protected apiV3:restangular.IService,
               protected apiMetaData:ApiMetaDataService,
               protected apiParamMapping:ApiParamMappingService) {

    this.WorkPackages = apiV3.service('work_packages');
  }

  public list(offset:number, pageSize:number, query:api.ex.Query, columns:api.ex.Column[]) {
    const columns = apiParamMapping.transformV3(columns);
    const columnNames = columns.map(column => column.name);

    return this.WorkPackages.getList(this.queryAsV3Params(offset, pageSize, query)).then(wpCollection => {
      wpCollection.forEach(workPackage => {
        workPackage.setProperties(columnNames);
      });

      return wpCollection;
    });
  }

  protected queryAsV3Params(offset:number, pageSize:number, query:api.ex.Query) {
    const params = {
      offset: offset,
      pageSize: pageSize,
      filters: [query.filters],
      sortBy: query.sort_criteria,
    };

    if (query.group_by) {
      params['groupBy'] = query.group_by;
    }

    if (query.display_sums) {
      params['showSums'] = query.display_sums;
    }

    return params;
  }
}


angular
  .module('openproject.api')
  .service('apiWorkPackages', ApiWorkPackagesService);
