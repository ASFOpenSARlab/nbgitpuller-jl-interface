from typing import Any
import subprocess
from shutil import which
import pathlib
import logging
import os

logger = logging.getLogger(__name__)

SAFE_BASE_DIR = pathlib.Path(os.getcwd()).resolve()

def _sanitize_destination(destination: str) -> pathlib.Path | None:
    """
    Normalize and validate the destination path to ensure it stays within SAFE_BASE_DIR.
    Returns a resolved pathlib.Path on success, or None if the destination is invalid.
    """
    try:
        dest_path = pathlib.Path(destination)
        # If the user supplies a relative path, interpret it relative to SAFE_BASE_DIR
        if not dest_path.is_absolute():
            dest_path = SAFE_BASE_DIR / dest_path
        resolved = dest_path.resolve()
        try:
            # Python 3.9+: is_relative_to
            is_within_base = resolved.is_relative_to(SAFE_BASE_DIR)
        except AttributeError:
            # Fallback for older Python versions
            try:
                resolved.relative_to(SAFE_BASE_DIR)
                is_within_base = True
            except ValueError:
                is_within_base = False
        if not is_within_base:
            logger.warning("Rejected destination outside SAFE_BASE_DIR: %s", resolved)
            return None
        return resolved
    except (OSError, RuntimeError) as exc:
        logger.warning("Failed to sanitize destination %r: %s", destination, exc)
        return None

def pullRepo(repository_url: str, repository_branch: str, destination: str) -> dict[str, Any]:
    command = which("gitpuller")
    
    if command is None:
        error = "gitpuller not found"
        return {"output": "", "error": error, "returncode": 1}

    safe_dest = _sanitize_destination(destination)
    if safe_dest is None:
        error = "Invalid destination path"
        return {"output": "", "error": error, "returncode": 1}

    result = subprocess.run(
        [command, repository_url, repository_branch, str(safe_dest)],
        capture_output=True,
        text=True
    )
    return {
        "output": result.stdout,
        "error": result.stderr,
        "returncode": result.returncode
    }

def checkIfRepoExists(repository_url: str, branch: str) -> dict[str, Any]:
    # Get git command
    command = which("git")
    
    if command is None:
        error = "git not found"
        return {"repoexists": False, "error": error, "returncode": 1}
    # Check remote exists
    result = subprocess.run(
        [command, "ls-remote", repository_url],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        return {
            "repoexists": result.stdout != "",
            "error": result.stderr,
            "returncode": result.returncode
        }
    # Check branch exists on remote
    result = subprocess.run(
        [command, "ls-remote", "--heads", repository_url, f"refs/heads/{branch}"],
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

    safe_dest = _sanitize_destination(destination)
    if safe_dest is None:
        error = "Invalid destination path"
        return {"updatefound": False, "error": error, "returncode": 1}

    # Check if repo exists locally
    if not safe_dest.exists():
        return {"updatefound": True, "error": "", "returncode": 0}
    # Fetch repo contents
    result = subprocess.run(
        [command, "-C", str(safe_dest), "fetch", "origin", branch],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        return {
            "updatefound": False,
            "error": result.stderr,
            "returncode": result.returncode,
        }

    # Check if repo is up to date
    result = subprocess.run(
        [command, "-C", str(safe_dest), "log", f"HEAD..origin/{branch}", "--oneline"],
        capture_output=True,
        text=True
    )
    # Command Notes
    # result.stdout = "" if error
    # error = "" if no error
    return {
        "updatefound": result.stdout != "",
        "error": result.stderr,
        "returncode": result.returncode,
    }
