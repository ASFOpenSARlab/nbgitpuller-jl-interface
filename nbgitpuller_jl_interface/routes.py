import json
import subprocess
from shutil import which
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

from nbgitpuller_jl_interface.utils import pullRepo, checkForRepoUpdate, checkIfRepoExists

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado

# Test commit6

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
    def post(self):
        body = json.loads(self.request.body)
        
        repository_url = body["repositoryUrl"]
        repository_branch = body["repositoryBranch"]
        destination = body["destination"]
        
        result = {
            "output": "",
            "error": "",
            "returncode": 42
        }
        
        # Pull repo
        ret = pullRepo(repository_url, repository_branch, destination)
        result.update(ret)

        self.finish(json.dumps(result))

class GitDetectUpdateHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        body = json.loads(self.request.body)
        
        repository_url = body["repositoryUrl"]
        repository_branch = body["repositoryBranch"]
        destination = body["destination"]
        
        # Default values for result, all should be updated before return
        result = {
            "repoexists": False,
            "updatefound": False,
            "error": "",
            "returncode": 42,
        }
        
        ret = checkIfRepoExists(repository_url)
        result.update(ret)
        # Exit early if error found
        if result["returncode"] != 0:
            self.finish(json.dumps(result))
            return
        
        # Check if there is an update
        ret = checkForRepoUpdate(destination, repository_branch)
        result.update(ret)

        self.finish(json.dumps(result))

def setup_route_handlers(web_app):
    logging.info("\n\nSetup route handlers\n\n")
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    hello_route_pattern = url_path_join(base_url, "nbgitpuller-jl-interface", "hello")
    gitpuller_route_pattern = url_path_join(base_url, "nbgitpuller-jl-interface", "gitpuller")
    git_update_checker_route_pattern = url_path_join(base_url, "nbgitpuller-jl-interface", "update-check")
    handlers = [
        (hello_route_pattern, HelloRouteHandler),
        (gitpuller_route_pattern, GitpullerRouteHandler),
        (git_update_checker_route_pattern, GitDetectUpdateHandler),
    ]

    web_app.add_handlers(host_pattern, handlers)
    logging.info(f"Added handlers")
