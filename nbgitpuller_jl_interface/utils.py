from apt_inst import Any
import subprocess
from shutil import which

def pullRepo(github_url: str, github_branch: str, destination: str) -> dict[str, Any]:
    command = which("gitpuller")
    
    if command is None:
        error = "gitpuller not found"
        return {"output": "", "error": error, "returncode": 1}
    
    result = subprocess.run(
        [command, github_url, github_branch, destination],
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
        