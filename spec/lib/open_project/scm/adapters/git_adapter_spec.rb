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

require 'spec_helper'

describe OpenProject::Scm::Adapters::Git do
  let(:url) { '/tmp/bar.git' }
  let(:config) { {} }
  let(:encoding) { nil }
  let(:adapter) {
    OpenProject::Scm::Adapters::Git.new(
      url,
      nil,
      nil,
      nil,
      encoding
    )
  }

  before do
    allow(adapter).to receive(:config).and_return(config)
  end

  describe 'client information' do
    it 'sets the Git client command' do
      expect(adapter.client_command).to eq('git')
    end

    context 'with client command from config' do
      let(:config) { { client_command: '/usr/local/bin/git' } }
      it 'overrides the Git client command from config' do
        expect(adapter.client_command).to eq('/usr/local/bin/git')
      end
    end

    shared_examples 'correct client version' do |git_string, expected_version|
      it 'should set the correct client version' do
        expect(adapter)
          .to receive(:scm_version_from_command_line)
          .and_return(git_string)

        expect(adapter.client_version).to eq(expected_version)
      end
    end

    it_behaves_like 'correct client version', "git version 1.7.3.4\n", [1, 7, 3, 4]
    it_behaves_like 'correct client version', "1.6.1\n1.7\n1.8", [1, 6, 1]
    it_behaves_like 'correct client version', "1.6.2\r\n1.8.1\r\n1.9.1", [1, 6, 2]
  end

  describe 'local repository' do
    with_filesystem_repository('git', 'git') do |repo_dir|
      let(:url) { repo_dir }

      it 'reads the git version' do
        expect(adapter.client_version.length).to be >= 3
      end

      it 'is a valid repository' do
        expect(Dir.exists?(repo_dir)).to be true

        out, process = Open3.capture2e('git', '--git-dir', repo_dir, 'branch')
        expect(process.exitstatus).to eq(0)
        expect(out).to include('master')
      end

      it 'should be available' do
        expect(adapter).to be_available
        expect { adapter.check_availability! }.to_not raise_error
      end

      it 'should read tags' do
        expect(adapter.tags).to match_array(%w[tag00.lightweight tag01.annotated])
      end

      describe '.branches' do
        it 'should show the default branch' do
          expect(adapter.default_branch).to eq('master')
        end

        it 'should read branches' do
          branches = %w[latin-1-path-encoding master test-latin-1 test_branch]
          expect(adapter.branches).to match_array(branches)
        end
      end

      describe '.info' do
        it 'builds the info object' do
          info = adapter.info
          expect(info.root_url).to eq(repo_dir)
          expect(info.lastrev.identifier).to eq('83ca5fd546063a3c7dc2e568ba3355661a9e2b2c')
        end
      end

      describe '.lastrev' do
        let(:felix_hex) { "Felix Sch\xC3\xA4fer" }

        it 'references the last revision for empty path' do
          lastrev = adapter.lastrev('', nil)
          expect(lastrev.identifier).to eq('83ca5fd546063a3c7dc2e568ba3355661a9e2b2c')
        end

        it 'references the last revision of the given path' do
          lastrev = adapter.lastrev('README', nil)
          expect(lastrev.identifier).to eq('4a07fe31bffcf2888791f3e6cbc9c4545cefe3e8')
          expect(lastrev.author).to eq('Adam Soltys <asoltys@gmail.com>')
          expect(lastrev.time).to eq('2009-06-24 07:27:38 +0200')

          # Even though that commit has a message, lastrev doesn't parse that deliberately
          expect(lastrev.message).to eq('')
          expect(lastrev.branch).to be_nil
          expect(lastrev.paths).to be_nil
        end

        it 'references the last revision of the given path and identifier' do
          lastrev = adapter.lastrev('README', '4f26664364207fa8b1af9f8722647ab2d4ac5d43')
          expect(lastrev.scmid).to eq('4a07fe31bffcf2888791f3e6cbc9c4545cefe3e8')
          expect(lastrev.identifier).to eq('4a07fe31bffcf2888791f3e6cbc9c4545cefe3e8')
          expect(lastrev.author).to eq('Adam Soltys <asoltys@gmail.com>')
          expect(lastrev.time).to eq('2009-06-24 05:27:38')
        end

        it 'works with spaces in filename' do
          lastrev = adapter.lastrev('filemane with spaces.txt',
                                    'ed5bb786bbda2dee66a2d50faf51429dbc043a7b')
          expect(lastrev.identifier).to eq('ed5bb786bbda2dee66a2d50faf51429dbc043a7b')
          expect(lastrev.scmid).to eq('ed5bb786bbda2dee66a2d50faf51429dbc043a7b')
          expect(lastrev.time).to eq('2010-09-18 19:59:46')
        end

        it 'encodes strings correctly' do
          lastrev = adapter.lastrev('filemane with spaces.txt',
                                    'ed5bb786bbda2dee66a2d50faf51429dbc043a7b')
          expect(lastrev.author).to eq('Felix Schäfer <felix@fachschaften.org>')
          expect(lastrev.author).to eq("#{felix_hex} <felix@fachschaften.org>")
        end
      end

      describe '.revisions' do
        it 'should retrieve all revisions' do
          rev = adapter.revisions('', nil, nil, all: true)
          expect(rev.length).to eq(21)
        end

        it 'should retrieve a certain revisions' do
          rev = adapter.revisions('', '899a15d^', '899a15d')
          expect(rev.length).to eq(1)
          expect(rev[0].identifier).to eq('899a15dba03a3b350b89c3f537e4bbe02a03cdc9')
          expect(rev[0].author).to eq('jsmith <jsmith@foo.bar>')
        end

        it 'should retrieve revisions in reverse' do
          rev = adapter.revisions('', nil, nil, all: true, reverse: true)
          expect(rev.length).to eq(21)
          expect(rev[0].identifier).to eq('7234cb2750b63f47bff735edc50a1c0a433c2518')
          expect(rev[20].identifier).to eq('1ca7f5ed374f3cb31a93ae5215c2e25cc6ec5127')
        end

        it 'should retrieve revisions in a specific time frame' do
          since = Time.gm(2010, 9, 30, 0, 0, 0)
          rev = adapter.revisions('', nil, nil, all: true, since: since)
          expect(rev.length).to eq(6)
          expect(rev[0].identifier).to eq('1ca7f5ed374f3cb31a93ae5215c2e25cc6ec5127')
          expect(rev[5].identifier).to eq('67e7792ce20ccae2e4bb73eed09bb397819c8834')
        end

        it 'should retrieve revisions in a specific time frame in reverse' do
          since = Time.gm(2010, 9, 30, 0, 0, 0)
          rev = adapter.revisions('', nil, nil, all: true, since: since, reverse: true)
          expect(rev.length).to eq(6)
          expect(rev[0].identifier).to eq('67e7792ce20ccae2e4bb73eed09bb397819c8834')
          expect(rev[5].identifier).to eq('1ca7f5ed374f3cb31a93ae5215c2e25cc6ec5127')
        end

        it 'should retrieve revisions by filename' do
          rev = adapter.revisions('filemane with spaces.txt', nil, nil, all: true)
          expect(rev.length).to eq(1)
          expect(rev[0].identifier).to eq('ed5bb786bbda2dee66a2d50faf51429dbc043a7b')
        end

        it 'should retrieve revisions with arbitrary whitespace' do
          file = ' filename with a leading space.txt '
          rev = adapter.revisions(file, nil, nil, all: true)
          expect(rev.length).to eq(1)
          expect(rev[0].paths[0][:path]).to eq(file)
        end

        it 'should show all paths of a revision' do
          rev = adapter.revisions('', '899a15d^', '899a15d')[0]
          expect(rev.paths.length).to eq(3)
          expect(rev.paths[0]).to eq(action: 'M', path: 'README')
          expect(rev.paths[1]).to eq(action: 'A', path: 'images/edit.png')
          expect(rev.paths[2]).to eq(action: 'A', path: 'sources/welcome_controller.rb')
        end
      end

      describe '.entries' do
        shared_examples 'retrieve entries' do
          it 'should retrieve entries from an identifier' do
            entries = adapter.entries('', '83ca5fd')
            expect(entries.length).to eq(9)

            expect(entries[0].name).to eq('images')
            expect(entries[0].kind).to eq('dir')
            expect(entries[0].size).to be_nil
            expect(entries[0]).to be_dir
            expect(entries[0]).not_to be_file

            expect(entries[3]).to be_file
            expect(entries[3].size).to eq(56)
            expect(entries[3].name).to eq(' filename with a leading space.txt ')
          end

          it 'should have a related revision' do
            entries = adapter.entries('', '83ca5fd')
            rev = entries[0].lastrev
            expect(rev.identifier).to eq('deff712f05a90d96edbd70facc47d944be5897e3')
            expect(rev.author).to eq('Adam Soltys <asoltys@gmail.com>')

            rev = entries[3].lastrev
            expect(rev.identifier).to eq('83ca5fd546063a3c7dc2e568ba3355661a9e2b2c')
            expect(rev.author).to eq('Felix Schäfer <felix@fachschaften.org>')
          end

          it 'can be retrieved by tag' do
            entries = adapter.entries(nil, 'tag01.annotated')
            expect(entries.length).to eq(3)

            sources = entries[1]
            expect(sources.name).to eq('sources')
            expect(sources.path).to eq('sources')
            expect(sources).to be_dir

            readme = entries[2]
            expect(readme.name).to eq('README')
            expect(readme.path).to eq('README')
            expect(readme).to be_file
            expect(readme.size).to eq(27)
            expect(readme.lastrev.identifier).to eq('899a15dba03a3b350b89c3f537e4bbe02a03cdc9')
            expect(readme.lastrev.time).to eq(Time.gm(2007, 12, 14, 9, 24, 1))
          end

          it 'can be retrieved by branch' do
            entries = adapter.entries(nil, 'test_branch')
            expect(entries.length).to eq(4)
            sources = entries[1]
            expect(sources.name).to eq('sources')
            expect(sources.path).to eq('sources')
            expect(sources).to be_dir

            readme = entries[2]
            expect(readme.name).to eq('README')
            expect(readme.path).to eq('README')
            expect(readme).to be_file
            expect(readme.size).to eq(159)

            expect(readme.lastrev.identifier).to eq('713f4944648826f558cf548222f813dabe7cbb04')
            expect(readme.lastrev.time).to eq(Time.gm(2009, 6, 19, 4, 37, 23))
          end
        end

        context 'with default encoding' do
          it_behaves_like 'retrieve entries'
        end

        context 'with latin-1 encoding' do
          let (:encoding) { 'ISO-8859-1' }
          let (:char1_hex) { "\xc3\x9c".force_encoding('UTF-8') }

          it_behaves_like 'retrieve entries'

          it 'can be retrieved with latin-1 encoding' do
            entries = adapter.entries('latin-1-dir', '64f1f3e8')
            expect(entries.length).to eq(3)
            f1 = entries[1]

            expect(f1.name).to eq("test-#{char1_hex}-2.txt")
            expect(f1.path).to eq("latin-1-dir/test-#{char1_hex}-2.txt")
            expect(f1).to be_file
          end

          it 'can be retrieved with latin-1 directories' do
            entries = adapter.entries("latin-1-dir/test-#{char1_hex}-subdir",
                                      '1ca7f5ed')
            expect(entries.length).to eq(3)
            f1 = entries[1]

            expect(f1).to be_file
            expect(f1.name).to eq("test-#{char1_hex}-2.txt")
            expect(f1.path).to eq("latin-1-dir/test-#{char1_hex}-subdir/test-#{char1_hex}-2.txt")
          end
        end
      end

      describe '.annotate' do
        it 'should annotate a regular file' do
          annotate = adapter.annotate('sources/watchers_controller.rb')
          expect(annotate).to be_kind_of(OpenProject::Scm::Adapters::Annotate)
          expect(annotate.lines.length).to eq(41)
          expect(annotate.lines[4].strip).to eq('# This program is free software; '\
                                                'you can redistribute it and/or')
          expect(annotate.revisions[4].identifier).to eq('7234cb2750b63f47bff735edc50a1c0a433c2518')
          expect(annotate.revisions[4].author).to eq('jsmith')
        end

        it 'should annotate moved file' do
          annotate = adapter.annotate('renamed_test.txt')
          expect(annotate.lines.length).to eq(2)
          expect(annotate.lines).to match_array(['This is a test',
                                                 "Let's pretend I'm adding a new feature!"])

          expect(annotate.revisions.length).to eq(2)
          expect(annotate.revisions[0].identifier).to eq('fba357b886984ee71185ad2065e65fc0417d9b92')
          expect(annotate.revisions[1].identifier).to eq('7e61ac704deecde634b51e59daa8110435dcb3da')
        end

        it 'should annotate with identifier' do
          annotate = adapter.annotate('README', 'HEAD~10')
          expect(annotate.lines.length).to eq(1)
          expect(annotate.revisions.length).to eq(1)
          expect(annotate.revisions[0].identifier).to eq('899a15dba03a3b350b89c3f537e4bbe02a03cdc9')
          expect(annotate.revisions[0].author).to eq('jsmith')
        end

        it 'should raise for an invalid path' do
          expect { adapter.annotate('does_not_exist.txt') }
            .to raise_error(OpenProject::Scm::Exceptions::CommandFailed)

          expect { adapter.annotate('/path/outside/repository') }
            .to raise_error(OpenProject::Scm::Exceptions::CommandFailed)
        end
      end

      describe '.cat' do
        it 'outputs the given file' do
          out = adapter.cat('README')
          expect(out).to include('Git test repository')
        end

        it 'raises an exception for an invalid file' do
          expect { adapter.cat('doesnotexiss') }
            .to raise_error(OpenProject::Scm::Exceptions::CommandFailed)
        end
      end

      describe '.diff' do
        it 'provides a full diff of the last commit by default' do
          diff = adapter.diff('', 'HEAD')
          expect(diff[0]).to eq('commit 83ca5fd546063a3c7dc2e568ba3355661a9e2b2c')
          expect(diff[1]).to eq("Author: Felix Sch\xE4fer <felix@fachschaften.org>")
        end

        it 'provides a negative diff' do
          diff = adapter.diff('', 'HEAD~1', 'HEAD')
          expect(diff.join("\n")).to include('-And this is a file')
        end

        it 'provides the complete for the given range' do
          diff = adapter.diff('', '61b685f', '2f9c009')
          expect(diff[1]).to eq('index 6cbd30c..b94e68e 100644')
          expect(diff[10]).to eq('index 4eca635..9a541fe 100644')
        end

        it 'provides the selected diff for the given range' do
          diff = adapter.diff('README', '61b685f', '2f9c009')
          expect(diff).to eq(<<-DIFF.strip_heredoc.split("\n"))
            diff --git a/README b/README
            index 6cbd30c..b94e68e 100644
            --- a/README
            +++ b/README
            @@ -1 +1,4 @@
             Mercurial test repository
            +
            +Mercurial is a distributed version control system. Mercurial is dedicated to speed and efficiency with a sane user interface.
            +It is written in Python.
          DIFF
        end
      end
    end
  end
end
