import json
import subprocess
from shutil import which

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado

# Test commit4

class HelloRouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({
            "data": (
                "Hello, world!"
                " This is the '/nbgitpuller-jl-interface/hello' endpoint."
                " Try visiting me in your browser!"
            ),
        }))

class GitpullerRouteHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        command = which("gitpuller")
        
        if command is None:
            self.finish(json.dumps({"error": "command not found"}))
            return
        
        result = subprocess.run(
            [command, "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git", "master", "$HOME/notebooks"],
            capture_output=True,
            text=True
        )
        self.finish(json.dumps({
            "output": result.stdout,
            "error": result.stderr,
            "returncode": result.returncode
        }))

    @tornado.web.authenticated
    def post(self):
        body = json.loads(self.request.body)
        
        # lab_url = body["labUrl"]
        github_url = body["githubUrl"]
        github_branch = body["githubBranch"]
        destination = body["destination"]
        command = which("gitpuller")
        
        if command is None:
            self.finish(json.dumps({"error": "gitpuller not found"}))
            return
        
        result = subprocess.run(
            [command, github_url, github_branch, destination],
            capture_output=True,
            text=True
        )
        
        self.finish(json.dumps({
            "result": {
                "output": result.stdout,
                "error": result.stderr,
                "returncode": result.returncode
            }
        }))

def setup_route_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    hello_route_pattern = url_path_join(base_url, "nbgitpuller-jl-interface", "hello")
    gitpuller_route_pattern = url_path_join(base_url, "nbgitpuller-jl-interface", "gitpuller")
    handlers = [
        (hello_route_pattern, HelloRouteHandler),
        (gitpuller_route_pattern, GitpullerRouteHandler),
    ]

    web_app.add_handlers(host_pattern, handlers)
