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

async def test_gitpuller(jp_fetch):
    response = await jp_fetch(
        "nbgitpuller-jl-interface", "gitpuller",
        method="POST",
        body=json.dumps({
            "githubUrl": "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git",
            "githubBranch": "master",
            "destination": "notebook",
        })
    )
    
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload.get('result')
    assert "output" in payload["result"]
    assert payload["result"]["output"] == "$ git clone --depth 1 --branch master -- https://github.com/ASFOpenSARlab/opensarlab-notebooks.git notebook\n\nCloning into 'notebook'...\n\n"
    assert "error" in payload["result"]
    assert "INFO -- Repo notebook doesn't exist. Cloning..." in payload["result"]["error"]
    assert "returncode" in payload["result"]
    assert payload["result"]["returncode"] == 0
