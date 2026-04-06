from subprocess import CompletedProcess
import pathlib
import os

BASE_DIR = pathlib.Path(os.getcwd()).resolve()

class TestPullRepo:
    def test_successful_pull(self, mocker, monkeypatch):
        from nbgitpuller_jl_interface.utils import pullRepo
        
        mock_subprocess_run = mocker.patch("nbgitpuller_jl_interface.utils.subprocess.run")
        mock_subprocess_run.return_value = CompletedProcess(args=None, stdout="process success", stderr="", returncode=0)
        
        monkeypatch.setattr("nbgitpuller_jl_interface.utils.which", lambda *args, **kwargs: "path/gitpuller")
        
        result = pullRepo(
            repository_url="https://fakerepo.com",
            repository_branch="main",
            destination="testDir",
        )
        expected_call = mocker.call([
                'path/gitpuller',
                'https://fakerepo.com',
                'main',
                str(BASE_DIR / 'testDir')
            ],
            capture_output=True,
            text=True
        )
        assert mock_subprocess_run.call_args_list == [
            expected_call
        ]
        assert result == {
            "output": "process success",
            "error": "",
            "returncode": 0
        }

    def test_failed_pull(self, mocker, monkeypatch):
        from nbgitpuller_jl_interface.utils import pullRepo
        
        mock_subprocess_run = mocker.patch("nbgitpuller_jl_interface.utils.subprocess.run")
        mock_subprocess_run.return_value = CompletedProcess(args=None, stdout="", stderr="\'https://fakerepo.com\']\' returned non-zero exit status 128.", returncode=1)
        
        monkeypatch.setattr("nbgitpuller_jl_interface.utils.which", lambda *args, **kwargs: "path/gitpuller")
        
        result = pullRepo(
            repository_url="https://fakerepo.com",
            repository_branch="main",
            destination="testDir",
        )
        assert mock_subprocess_run.call_args_list == [
            mocker.call(
                [
                    'path/gitpuller',
                    'https://fakerepo.com',
                    'main',
                    str(BASE_DIR / 'testDir')
                ],
                capture_output=True,
                text=True
            )
        ]
        assert (field in result for field in ["output", "error", "returncode"])
        assert result["output"] == ""
        assert "\'https://fakerepo.com\']\' returned non-zero exit status 128." in result["error"]
        assert result["returncode"] == 1

class TestCheckIfRepoExists:
    def test_repo_exists(self, mocker, monkeypatch):
        from nbgitpuller_jl_interface.utils import checkIfRepoExists
        
        mock_subprocess_run = mocker.patch("nbgitpuller_jl_interface.utils.subprocess.run")
        mock_subprocess_run.return_value = CompletedProcess(args=None, stdout="as8953\tHEAD\243...", stderr="", returncode=0)

        monkeypatch.setattr("nbgitpuller_jl_interface.utils.which", lambda *args, **kwargs: "path/git")
        result = checkIfRepoExists(
            repository_url="https://fakerepo.com",
        )

        assert mock_subprocess_run.call_args_list == [
            mocker.call(
                [
                    'path/git',
                    'ls-remote',
                    'https://fakerepo.com',
                ],
                capture_output=True,
                text=True
            )
        ]
        assert result == {
            'repoexists': True,
            'error': '',
            'returncode': 0
        }

    def test_repo_not_exist(self, mocker, monkeypatch):
        from nbgitpuller_jl_interface.utils import checkIfRepoExists
        
        mock_subprocess_run = mocker.patch("nbgitpuller_jl_interface.utils.subprocess.run")
        mock_subprocess_run.return_value = CompletedProcess(args=None, stdout="", stderr="fatal: unable to access 'https://fakerepo.com/': Could not resolve host: fakerepo.com\n", returncode=128)

        monkeypatch.setattr("nbgitpuller_jl_interface.utils.which", lambda *args, **kwargs: "path/git")
        result = checkIfRepoExists(
            repository_url="https://fakerepo.com",
        )

        assert mock_subprocess_run.call_args_list == [
            mocker.call(
                [
                    'path/git',
                    'ls-remote',
                    'https://fakerepo.com',
                ],
                capture_output=True,
                text=True
            )
        ]
        assert result == {
            'repoexists': False,
            'error': "fatal: unable to access 'https://fakerepo.com/': Could not resolve host: fakerepo.com\n",
            'returncode': 128
        }
        

class TestCheckIfRepoExists:
    def test_test(self, mocker, monkeypatch):
        from nbgitpuller_jl_interface.utils import checkForRepoUpdate
        result = checkForRepoUpdate(
            destination="fakepath", 
            branch=""
        )
        pass

    def test_repo_exists_no_update(self, mocker, monkeypatch):
        from nbgitpuller_jl_interface.utils import checkForRepoUpdate
        
        mock_subprocess_run = mocker.patch("nbgitpuller_jl_interface.utils.subprocess.run")
        mock_subprocess_run.side_effect = [
            CompletedProcess(args=None, stdout="", stderr="From https://fakerepo.com\n * branch            main       -> FETCH_HEAD\n", returncode=0),
            CompletedProcess(args=None, stdout="", stderr="", returncode=0),
        ]

        monkeypatch.setattr("nbgitpuller_jl_interface.utils.which", lambda *args, **kwargs: "path/git")
        
        monkeypatch.setattr("nbgitpuller_jl_interface.utils.pathlib.Path.exists", lambda *args, **kwargs: True)
        
        result = checkForRepoUpdate(
            destination="fakepath", 
            branch="fakebranch"
        )
        assert mock_subprocess_run.call_args_list == [
            mocker.call(
                [
                    'path/git',
                    '-C',
                    str(BASE_DIR / 'fakepath'),
                    'fetch',
                    'origin',
                    'fakebranch'
                ],
                capture_output=True,
                text=True
            ),
            mocker.call(
                [
                    'path/git',
                    '-C',
                    str(BASE_DIR / 'fakepath'),
                    'log',
                    'HEAD..origin/fakebranch',
                    '--oneline'
                ],
                capture_output=True,
                text=True
            )
        ]
        assert result == {
            "updatefound": False,
            "error": "",
            "returncode": 0,
        }

    def test_repo_exists_with_update(self, mocker, monkeypatch):
        from nbgitpuller_jl_interface.utils import checkForRepoUpdate
        
        mock_subprocess_run = mocker.patch("nbgitpuller_jl_interface.utils.subprocess.run")
        mock_subprocess_run.side_effect = [
            CompletedProcess(args=None, stdout="", stderr="From https://fakerepo.com\n * branch            main       -> FETCH_HEAD\n", returncode=0),
            CompletedProcess(args=None, stdout="123456 Mycommit message\n", stderr="", returncode=0),
        ]

        monkeypatch.setattr("nbgitpuller_jl_interface.utils.which", lambda *args, **kwargs: "path/git")
        
        monkeypatch.setattr("nbgitpuller_jl_interface.utils.pathlib.Path.exists", lambda *args, **kwargs: True)
        
        result = checkForRepoUpdate(
            destination="fakepath", 
            branch="fakebranch"
        )
        assert mock_subprocess_run.call_args_list == [
            mocker.call(
                [
                    'path/git',
                    '-C',
                    str(BASE_DIR / 'fakepath'),
                    'fetch',
                    'origin',
                    'fakebranch'
                ],
                capture_output=True,
                text=True
            ),
            mocker.call(
                [
                    'path/git',
                    '-C',
                    str(BASE_DIR / 'fakepath'),
                    'log',
                    'HEAD..origin/fakebranch',
                    '--oneline'
                ],
                capture_output=True,
                text=True
            )
        ]
        assert result == {
            "updatefound": True,
            "error": "",
            "returncode": 0,
        }

    def test_repo_error_fetching(self, mocker, monkeypatch):
        from nbgitpuller_jl_interface.utils import checkForRepoUpdate
        
        mock_subprocess_run = mocker.patch("nbgitpuller_jl_interface.utils.subprocess.run")
        mock_subprocess_run.side_effect = [
            CompletedProcess(args=None, stdout="", stderr="Some error message", returncode=1),
        ]

        monkeypatch.setattr("nbgitpuller_jl_interface.utils.which", lambda *args, **kwargs: "path/git")
        
        monkeypatch.setattr("nbgitpuller_jl_interface.utils.pathlib.Path.exists", lambda *args, **kwargs: True)
        
        result = checkForRepoUpdate(
            destination="fakepath", 
            branch="fakebranch"
        )
        assert mock_subprocess_run.call_args_list == [
            mocker.call(
                [
                    'path/git',
                    '-C',
                    str(BASE_DIR / 'fakepath'),
                    'fetch',
                    'origin',
                    'fakebranch'
                ],
                capture_output=True,
                text=True
            )
        ]
        assert result == {
            "updatefound": False,
            "error": "Some error message",
            "returncode": 1,
        }

    def test_repo_not_exist(self, mocker, monkeypatch):
        from nbgitpuller_jl_interface.utils import checkForRepoUpdate
        
        monkeypatch.setattr("nbgitpuller_jl_interface.utils.pathlib.Path.exists", lambda *args, **kwargs: False)
        
        result = checkForRepoUpdate(
            destination="fakepath", 
            branch="fakebranch"
        )
        assert result == {
            "updatefound": True,
            "error": "",
            "returncode": 0,
        }
        