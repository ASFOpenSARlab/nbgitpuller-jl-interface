import json


async def test_hello(jp_fetch):
    # When
    response = await jp_fetch("nbgitpuller-jl-interface", "hello")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
            "data": (
                "Hello, world!"
                " This is the '/nbgitpuller-jl-interface/hello' endpoint."
                " Try visiting me in your browser!"
            ),
        }

###
### GitpullerRouteHandler Tests
###
class TestGitpullerRouteHandler:
    async def test_gitpuller_success(self, jp_fetch, monkeypatch):
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.pullRepo", lambda *args, **kwargs: {
            "output": "$ git clone --depth 1 --branch master -- https://github.com/ASFOpenSARlab/opensarlab-notebooks.git notebook\n\nCloning into 'notebook'...\n\n",
            "error": "INFO -- Repo notebook doesn't exist. Cloning...",
            "returncode": 0
        })
        
        response = await jp_fetch(
            "nbgitpuller-jl-interface", "gitpuller",
            method="POST",
            body=json.dumps({
                "repositoryUrl": "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git",
                "repositoryBranch": "master",
                "destination": "notebook",
            })
        )
        
        assert response.code == 200
        payload = json.loads(response.body)
        assert (field in payload for field in ["output", "error", "returncode"])
        assert payload["output"] == "$ git clone --depth 1 --branch master -- https://github.com/ASFOpenSARlab/opensarlab-notebooks.git notebook\n\nCloning into 'notebook'...\n\n"
        assert "INFO -- Repo notebook doesn't exist. Cloning..." in payload["error"]
        assert payload["returncode"] == 0

    async def test_gitpuller_failure(self, jp_fetch, monkeypatch):
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.pullRepo", lambda *args, **kwargs: {
            "output": "",
            "error": "\'https://fakerepo.com\']\' returned non-zero exit status 128.",
            "returncode": 1
        })
        
        response = await jp_fetch(
            "nbgitpuller-jl-interface", "gitpuller",
            method="POST",
            body=json.dumps({
                "repositoryUrl": "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git",
                "repositoryBranch": "master",
                "destination": "notebook",
            })
        )
        
        assert response.code == 200
        payload = json.loads(response.body)
        assert "output" in payload
        assert payload["output"] == ""
        assert "error" in payload
        assert "\'https://fakerepo.com\']\' returned non-zero exit status 128." in payload["error"]
        assert "returncode" in payload
        assert payload["returncode"] == 1

###
### GitDetectUpdateHandler Tests
###
class TestGitDetectUpdateHandler:
    async def test_check_repo_updates_no_repo(self, jp_fetch, monkeypatch):
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.checkIfRepoExists", lambda *args, **kwargs: {"repoexists": False, "error": "Repo does not exist", "returncode": 1})

        response = await jp_fetch(
            "nbgitpuller-jl-interface", "update-check",
            method="POST",
            body=json.dumps({
                "repositoryUrl": "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git",
                "repositoryBranch": "master",
                "destination": "notebook",
            })
        )

        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == {
            "repoexists": False, 
            "updatefound": False,
            "error": "Repo does not exist",
            "returncode": 1,
        }
        
    async def test_check_repo_updates_repo_exists_no_update(self, jp_fetch, monkeypatch):
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.checkIfRepoExists", lambda *args, **kwargs: {
            "repoexists": True,
            "error": "",
            "returncode": 0
        })
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.checkForRepoUpdate", lambda *args, **kwargs: {
            "updatefound": False,
            "error": "",
            "returncode": 0
        })

        response = await jp_fetch(
            "nbgitpuller-jl-interface", "update-check",
            method="POST",
            body=json.dumps({
                "repositoryUrl": "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git",
                "repositoryBranch": "master",
                "destination": "notebook",
            })
        )

        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == {
            "repoexists": True, 
            "updatefound": False,
            "error": "",
            "returncode": 0,
        }
        
    async def test_check_repo_updates_repo_exists_with_update(self, jp_fetch, monkeypatch):
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.checkIfRepoExists", lambda *args, **kwargs: {
            "repoexists": True,
            "error": "",
            "returncode": 0
        })
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.checkForRepoUpdate", lambda *args, **kwargs: {
            "updatefound": True,
            "error": "",
            "returncode": 0
        })

        response = await jp_fetch(
            "nbgitpuller-jl-interface", "update-check",
            method="POST",
            body=json.dumps({
                "repositoryUrl": "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git",
                "repositoryBranch": "master",
                "destination": "notebook",
            })
        )

        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == {
            "repoexists": True, 
            "updatefound": True,
            "error": "",
            "returncode": 0,
        }

    async def test_check_repo_updates_with_check_exist_error(self, jp_fetch, monkeypatch):
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.checkIfRepoExists", lambda *args, **kwargs: {
            "repoexists": False,
            "error": "fatal: 'http://fakerepo' does not appear to be a git repository...",
            "returncode": 128
        })
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.checkForRepoUpdate", lambda *args, **kwargs: {
            "updatefound": True,
            "error": "",
            "returncode": 0
        })

        response = await jp_fetch(
            "nbgitpuller-jl-interface", "update-check",
            method="POST",
            body=json.dumps({
                "repositoryUrl": "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git",
                "repositoryBranch": "master",
                "destination": "notebook",
            })
        )

        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == {
            "repoexists": False, 
            "updatefound": False,
            "error": "fatal: 'http://fakerepo' does not appear to be a git repository...",
            "returncode": 128,
        }

    async def test_check_repo_updates_with_check_update_error(self, jp_fetch, monkeypatch):
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.checkIfRepoExists", lambda *args, **kwargs: {
            "repoexists": True,
            "error": "",
            "returncode": 0
        })
        monkeypatch.setattr("nbgitpuller_jl_interface.routes.checkForRepoUpdate", lambda *args, **kwargs: {
            "updatefound": False,
            "error": "There was an error checking for repo updates",
            "returncode": 42
        })

        response = await jp_fetch(
            "nbgitpuller-jl-interface", "update-check",
            method="POST",
            body=json.dumps({
                "repositoryUrl": "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git",
                "repositoryBranch": "master",
                "destination": "notebook",
            })
        )

        assert response.code == 200
        payload = json.loads(response.body)
        assert payload == {
            "repoexists": True, 
            "updatefound": False,
            "error": "There was an error checking for repo updates",
            "returncode": 42,
        }
