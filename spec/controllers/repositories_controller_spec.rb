#-- copyright
# OpenProject is a project management system.
# Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2013 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See doc/COPYRIGHT.rdoc for more details.
#++

require 'spec_helper'

describe RepositoriesController, type: :controller do
  let(:project) do
    project = FactoryGirl.create(:project)
    allow(Project).to receive(:find).and_return(project)
    project
  end
  let(:user) {
    FactoryGirl.create(:user, member_in_project: project,
                              member_through_role: role)
  }
  let (:url) { 'file:///tmp/something/does/not/exist.svn' }

  let(:repository) do
    allow(Setting).to receive(:enabled_scm).and_return(['Subversion'])
    repo = FactoryGirl.build_stubbed(:repository_subversion,
                                     scm_type: 'local',
                                     url: url,
                                     project: project)
    allow(repo).to receive(:default_branch).and_return('master')
    allow(repo).to receive(:branches).and_return(['master'])
    allow(repo).to receive(:save).and_return(true)

    repo
  end

  before do
    allow(User).to receive(:current).and_return(user)
    allow(project).to receive(:repository).and_return(repository)
  end

  describe 'manages the repository' do
    let(:role) { FactoryGirl.create(:role, permissions: [:manage_repository]) }

    before do
      # authorization checked in spec/permissions/manage_repositories_spec.rb
      allow(controller).to receive(:authorize).and_return(true)
    end

    shared_examples_for 'successful settings response' do
      it 'is successful' do
        expect(response).to be_success
      end

      it 'renders the template' do
        expect(response).to render_template 'repositories/settings/repository_form'
      end
    end

    context 'with #edit' do
      before do
        xhr :get, :edit
      end

      it_behaves_like 'successful settings response'
    end

    context 'with #update' do
      before do
        xhr :put, :update
      end

      it_behaves_like 'successful settings response'
    end

    context 'with #create' do
      before do
        xhr :post, :create, scm_vendor: 'Subversion', scm_type: 'local', url: 'file:///tmp/repo.svn/'
      end

      it 'renders a JS redirect' do
        expect(response.body)
          .to match(/window\.location = '\/projects\/(#{project.identifier}|#{project.id})\/settings\/repository'/)
      end
    end
  end

  describe 'with filesystem repository' do
    with_filesystem_repository('subversion', 'svn') do |repo_dir|
      let(:url) { "file://#{repo_dir}" }

      describe 'commits per author graph' do
        before do
          get :graph, project_id: project.identifier, graph: 'commits_per_author'
        end

        context 'requested by an authorized user' do
          let(:role) {
            FactoryGirl.create(:role, permissions: [:browse_repository,
                                                    :view_commit_author_statistics])
          }

          it 'should be successful' do
            expect(response).to be_success
          end

          it 'should have the right content type' do
            expect(response.content_type).to eq('image/svg+xml')
          end
        end

        context 'requested by an unauthorized user' do
          let(:role) { FactoryGirl.create(:role, permissions: [:browse_repository]) }

          it 'should return 403' do
            expect(response.code).to eq('403')
          end
        end
      end

      describe 'stats' do
        before do
          get :stats, project_id: project.identifier
        end

        describe 'requested by a user with view_commit_author_statistics permission' do
          let(:role) {
            FactoryGirl.create(:role, permissions: [:browse_repository,
                                                    :view_commit_author_statistics])
          }

          it 'show the commits per author graph' do
            expect(assigns(:show_commits_per_author)).to eq(true)
          end
        end

        describe 'requested by a user without view_commit_author_statistics permission' do
          let(:role) { FactoryGirl.create(:role, permissions: [:browse_repository]) }

          it 'should NOT show the commits per author graph' do
            expect(assigns(:show_commits_per_author)).to eq(false)
          end
        end
      end
    end
  end
end
