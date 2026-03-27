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
    print(payload)
    assert False
    assert payload == {
        'result': '{"output": "$ git clone --depth 1 --branch master -- https://github.com/ASFOpenSARlab/opensarlab-notebooks.git notebook\\n\\nCloning into \'notebook\'...\\n\\n", "error": "[2026-03-27 00:19:16,025] INFO -- Repo notebook doesn\'t exist. Cloning...\\n[2026-03-27 00:19:17,841] INFO -- Repo notebook initialized\\n", "returncode": 0}'
        }
