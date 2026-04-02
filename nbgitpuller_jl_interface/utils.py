from typing import Any
import subprocess
from shutil import which
import pathlib
import logging
logger = logging.getLogger(__name__)

def pullRepo(repository_url: str, repository_branch: str, destination: str) -> dict[str, Any]:
    command = which("gitpuller")
    
    if command is None:
        error = "gitpuller not found"
        return {"output": "", "error": error, "returncode": 1}
    
    result = subprocess.run(
        [command, repository_url, repository_branch, destination],
        capture_output=True,
        text=True
    )
    return {
        "result": {
            "output": result.stdout,
            "error": result.stderr,
            "returncode": result.returncode
        }
    }

def checkIfRepoExists(repository_url) -> dict[str, Any]:
    # Get git command
    command = which("git")
    
    if command is None:
        error = "git not found"
        return {"repoexists": False, "error": error, "returncode": 1}
    # Fetch repo contents
    result = subprocess.run(
        [command, "ls-remote", repository_url],
        capture_output=True,
        text=True
    ) 
    return {
        "repoexists": result.stdout != "",
        "error": result.stderr,
        "returncode": result.returncode
    }

def checkForRepoUpdate(destination: str, branch: str) -> dict[str, Any]:
    # Get git command
    command = which("git")
    
    if command is None:
        error = "git not found"
        return {"updatefound": False, "error": error, "returncode": 1}
    
    # Check if repo exists locally
    if not pathlib.Path(destination).exists():
        return {"updatefound": True, "error": "", "returncode": 0}
    # Fetch repo contents
    result = subprocess.run(
        [command, "-C", destination, "fetch", "origin", branch],
        capture_output=True,
        text=True
    )
    # Check if repo is up to date
    result = subprocess.run(
        [command, "-C", destination, "log", f"HEAD..origin/{branch}", "--oneline"],
        capture_output=True,
        text=True
    )
    return {
        "updatefound": result.stdout != "",
        "error": result.stderr,
        "returncode": result.returncode,
    }
