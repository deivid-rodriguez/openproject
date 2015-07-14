#-- encoding: UTF-8
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

class Repository < ActiveRecord::Base
  include Redmine::Ciphering
  include OpenProject::Scm::ManageableRepository

  class BuildFailed < StandardError
  end

  belongs_to :project
  has_many :changesets, order: "#{Changeset.table_name}.committed_on DESC, #{Changeset.table_name}.id DESC"

  before_save :sanitize_urls
  after_save :create_managed_repository, if: Proc.new { |repo| repo.managed? }

  # Raw SQL to delete changesets and changes in the database
  # has_many :changesets, :dependent => :destroy is too slow for big repositories
  before_destroy :clear_changesets

  attr_protected :project_id

  validates_length_of :password, maximum: 255, allow_nil: true
  validate :validate_enabled_scm, on: :create

  def changes
    Change.where(changeset_id: changesets).joins(:changeset)
  end

  # Checks if the SCM is enabled when creating a repository
  def validate_enabled_scm
    errors.add(:type, :invalid) unless Setting.enabled_scm.include?(self.class.name.demodulize)
  end

  # Removes leading and trailing whitespace
  def url=(arg)
    write_attribute(:url, arg ? arg.to_s.strip : nil)
  end

  # Removes leading and trailing whitespace
  def root_url=(arg)
    write_attribute(:root_url, arg ? arg.to_s.strip : nil)
  end

  def password
    read_ciphered_attribute(:password)
  end

  def password=(arg)
    write_ciphered_attribute(:password, arg)
  end

  def scm_adapter
    self.class.scm_adapter_class
  end

  def scm
    @scm ||= scm_adapter.new(url, root_url,
                             login, password, path_encoding)
    self.root_url = @scm.root_url if root_url.blank?
    @scm
  end

  def vendor
    self.class.vendor
  end

  def supported_types
    []
  end

  def supports_cat?
    scm.supports_cat?
  end

  def supports_annotate?
    scm.supports_annotate?
  end

  def supports_all_revisions?
    true
  end

  def supports_directory_revisions?
    false
  end

  def entry(path = nil, identifier = nil)
    scm.entry(path, identifier)
  end

  def entries(path = nil, identifier = nil)
    scm.entries(path, identifier)
  end

  def branches
    scm.branches
  end

  def tags
    scm.tags
  end

  def default_branch
    scm.default_branch
  end

  def properties(path, identifier = nil)
    scm.properties(path, identifier)
  end

  def cat(path, identifier = nil)
    scm.cat(path, identifier)
  end

  def diff(path, rev, rev_to)
    scm.diff(path, rev, rev_to)
  end

  def diff_format_revisions(cs, cs_to, sep = ':')
    text = ''
    text << cs_to.format_identifier + sep if cs_to
    text << cs.format_identifier if cs
    text
  end

  # Returns a path relative to the url of the repository
  def relative_path(path)
    path
  end

  # Finds and returns a revision with a number or the beginning of a hash
  def find_changeset_by_name(name)
    name = name.to_s
    return nil if name.blank?
    changesets.find(:first, conditions: (name.match(/\A\d*\z/) ? ['revision = ?', name] : ['revision LIKE ?', name + '%']))
  end

  def latest_changeset
    @latest_changeset ||= changesets.find(:first)
  end

  # Returns the latest changesets for +path+
  # Default behaviour is to search in cached changesets
  def latest_changesets(path, _rev, limit = 10)
    if path.blank?
      changesets.find(:all,
                      include: :user,
                      order: "#{Changeset.table_name}.committed_on DESC, "\
                             "#{Changeset.table_name}.id DESC",
                      limit: limit)
    else
      changes.find(:all,
                   include: { changeset: :user },
                   conditions: ['path = ?', path.with_leading_slash],
                   order: "#{Changeset.table_name}.committed_on DESC, "\
                          "#{Changeset.table_name}.id DESC",
                   limit: limit).map(&:changeset)
    end
  end

  def scan_changesets_for_work_package_ids
    changesets.each(&:scan_comment_for_work_package_ids)
  end

  # Returns an array of committers usernames and associated user_id
  def committers
    @committers ||= Changeset.connection.select_rows("SELECT DISTINCT committer, user_id FROM #{Changeset.table_name} WHERE repository_id = #{id}")
  end

  # Maps committers username to a user ids
  def committer_ids=(h)
    if h.is_a?(Hash)
      committers.each do |committer, user_id|
        new_user_id = h[committer]
        if new_user_id && (new_user_id.to_i != user_id.to_i)
          new_user_id = (new_user_id.to_i > 0 ? new_user_id.to_i : nil)
          Changeset.update_all("user_id = #{ new_user_id.nil? ? 'NULL' : new_user_id }", ['repository_id = ? AND committer = ?', id, committer])
        end
      end
      @committers = nil
      @found_committer_users = nil
      true
    else
      false
    end
  end

  # Returns the Redmine User corresponding to the given +committer+
  # It will return nil if the committer is not yet mapped and if no User
  # with the same username or email was found
  def find_committer_user(committer)
    unless committer.blank?
      @found_committer_users ||= {}
      return @found_committer_users[committer] if @found_committer_users.has_key?(committer)

      user = nil
      c = changesets.find(:first, conditions: { committer: committer }, include: :user)
      if c && c.user
        user = c.user
      elsif committer.strip =~ /\A([^<]+)(<(.*)>)?\z/
        username, email = $1.strip, $3
        u = User.find_by_login(username)
        u ||= User.find_by_mail(email) unless email.blank?
        user = u
      end
      @found_committer_users[committer] = user
      user
    end
  end

  def repo_log_encoding
    encoding = log_encoding.to_s.strip
    encoding.blank? ? 'UTF-8' : encoding
  end

  # Fetches new changesets for all repositories of active projects
  # Can be called periodically by an external script
  # eg. ruby script/runner "Repository.fetch_changesets"
  def self.fetch_changesets
    Project.active.has_module(:repository).find(:all, include: :repository).each do |project|
      if project.repository
        begin
          project.repository.fetch_changesets
        rescue OpenProject::Scm::Exceptions::CommandFailed => e
          logger.error "scm: error during fetching changesets: #{e.message}"
        end
      end
    end
  end

  # scan changeset comments to find related and fixed work packages for all repositories
  def self.scan_changesets_for_work_package_ids
    all.each(&:scan_changesets_for_work_package_ids)
  end


  ##
  # Builds a model instance of type +Repository::#{vendor}+ with the given parameters.
  #
  # @param [Project] project The project this repository belongs to.
  # @param [String] vendor   The SCM vendor name (e.g., Git, Subversion)
  # @param [Hash] params     Custom parameters for this SCM as delivered from the repository
  #                          field.
  #
  # @param [Symbol] type     SCM tag to determine the type this repository should be built as
  #
  # @raise [Repository::BuildFailed] Raised when the instance could not be built
  #                                  given the parameters.
  # @raise [::NameError] Raised when the given +vendor+ could not be resolved to a class.
  def self.build(project, vendor, params, type)
    repository = build_and_configure(project, vendor, params, type)
    if repository.save
      repository
    else
      raise BuildFailed.new repository.errors.full_messages.join("\n")
    end
  end

  ##
  # Build a temporary model instance of the given vendor for temporary use in forms.
  # Will not receive any args.
  def self.build_scm_class(vendor)
    klass = OpenProject::Scm::Manager.registered[vendor]

    if klass.nil?
      raise BuildFailed.new I18n.t('repositories.errors.disabled_or_unknown_vendor',
                                   vendor: vendor)
    else
      klass
    end
  end

  def self.scm_adapter_class
    nil
  end

  def self.vendor
    name.demodulize
  end

  def self.build_and_configure(project, vendor, params, type)
    klass = build_scm_class(vendor)

    # We can't possibly know the form fields this particular vendor
    # desires, so we allow it to filter them from raw params
    # before building the instance with it.
    args = klass.permitted_params(params)

    repository = klass.new(args)
    repository.project = project
    repository.scm_type = type

    repository.configure(args)

    repository
  end


  # Strips url and root_url
  def sanitize_urls
    url.strip! if url.present?
    root_url.strip! if root_url.present?
    true
  end

  def clear_changesets
    cs, ch, ci = Changeset.table_name, Change.table_name, "#{table_name_prefix}changesets_work_packages#{table_name_suffix}"
    connection.delete("DELETE FROM #{ch} WHERE #{ch}.changeset_id IN (SELECT #{cs}.id FROM #{cs} WHERE #{cs}.repository_id = #{id})")
    connection.delete("DELETE FROM #{ci} WHERE #{ci}.changeset_id IN (SELECT #{cs}.id FROM #{cs} WHERE #{cs}.repository_id = #{id})")
    connection.delete("DELETE FROM #{cs} WHERE #{cs}.repository_id = #{id}")
  end

  private

  ##
  # Create local managed repository request when the built instance
  # is managed by OpenProject
  def create_managed_repository
    service = Scm::CreateManagedRepositoryService.new(self)
    if service.call
      true
    else
      raise BuildFailed.new service.localized_rejected_reason
    end
  end
end
