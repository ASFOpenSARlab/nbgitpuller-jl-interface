import { JupyterFrontEnd } from '@jupyterlab/application';

import { ToolbarButton } from '@jupyterlab/apputils';

import { find } from '@lumino/algorithm';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

const widget_id = 'nbgitpuller-jl-interface-update-btn';
var intervalID = 0;

interface Repository{
  repoUrl:string,
  branch:string,
  destPath: string,
  _commitHash: string 
}

export async function nbgitpullerUpdateButton(
  app: JupyterFrontEnd,
  allSettings: ISettingRegistry.ISettings,
): Promise<void>{
  const repositories = allSettings.get('repos').composite as any as Repository[];
  const rank = allSettings.get('rank').composite as number;

  // Remove previous button if exists
  const widget = find(app.shell.widgets('top'), w => w.id === widget_id)
  if(widget){
    widget.dispose();
  }

  // Create widget
  const updateReposBtn = new ToolbarButton({
    className: "nbgitpuller-jl-interface-update-btn",
    label: '◉ Update Repos',
    onClick: async () => {
      const failed_updates = await makeNbgitpullerRequest(repositories);
      console.log(`Failed to update the following repos: ${failed_updates}`)
    },
    tooltip: 'Pull the latest changes from your repos'
  });
  updateReposBtn.id = widget_id;
  updateReposBtn.addClass('nbgitpuller-jl-interface-wrapper');
  // 1-899 left justified, 900+ right justified
  app.shell.add(updateReposBtn, 'top', { rank: rank});

  // Check for updates
  await checkForRepoUpdates(repositories)

  console.log('nbgitpuller-jl-interface settings loaded');
}

export async function makeNbgitpullerRequest(
  repositories: Repository[],
) {
  const url = window.location.origin + '/nbgitpuller-jl-interface/gitpuller';
  const xsrfToken = document.cookie
    .split(';')
    .find(row => row.startsWith('_xsrf='))
    ?.split('=')[1];
  // Update repositories
  var failed_updates: string[] = [];
  for (var repo of repositories){
    const githubUrl = repo["repoUrl"]
    const githubBranch = repo["branch"]
    const destination = repo["destPath"]

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRFToken': xsrfToken ?? ''
      },
      body: JSON.stringify({
        githubUrl: githubUrl,
        githubBranch: githubBranch,
        destination: destination
      })
    });
    const data = await response.json() as { result: {output: string, error: string, returncode: number} };
    if (data["result"]["returncode"] != 0){
      failed_updates.push(githubUrl);
    }
  }
  return failed_updates;
}

export async function repoUpdateProbe(allSettings: ISettingRegistry.ISettings): Promise<void>{
  const repositories = allSettings.get('repos').composite as any as Repository[];
  const probeInterval = allSettings.get('probeInterval').composite as number;
  console.log(repositories)

  // Stop previous interval (if settings were changed)
  clearInterval(intervalID);

  // Create interval
  intervalID = setInterval(async () =>{await checkForRepoUpdates(repositories)}, probeInterval);
}

export async function checkForRepoUpdates(repositories: Repository[]){
    var numToBeUpdated = 0;
    var numWithErrors = 0;
    // Check every repository
    for (var repo of repositories){
      // Get relevant repository information
      const githubUrl = repo["repoUrl"]
      const githubBranch = repo["branch"]
      const _commitHash = repo["_commitHash"]
      // Get repo owner and name
      const splitUrl = githubUrl.split("/")
      if (splitUrl.length < 5){
        console.error(`Invalid repository url: ${githubUrl}`)
        numWithErrors += 1;
        continue
      }
      const repositoryOwner = splitUrl[3]
      const repositoryName = splitUrl[4].split(".")[0]

      // Compare hashes
      const newCommitHash = await getMostRecentRepoHash(repositoryName, repositoryOwner, githubBranch)
      if(newCommitHash == "error"){
        console.error(`Unable to get commit hash for repo: ${githubUrl} branch: ${githubBranch}`)
        numWithErrors += 1;
        continue
      }
      if(newCommitHash != _commitHash){
        numToBeUpdated += 1;
        continue
      }
    }
    const tooltip = `${numToBeUpdated} awaiting updates\n${numWithErrors} repos with errors`;
    const response = await setUpdateButtonDisplay(numToBeUpdated+numWithErrors == 0, tooltip, repositories)
    if(response.returncode != 0){
      console.error(response)
    }
}

export async function getMostRecentRepoHash(
  repositoryName: string,
  repositoryOwner: string,
  branch: string,
): Promise<string>{
  const url = `https://api.github.com/repos/${repositoryOwner}/${repositoryName}/git/ref/heads/${branch}`;
  const headers = {
    "Accept": "application/vnd.github+json"
  }

  const response = await fetch(url, {headers});
  const data = await response.json()

  if(data?.object?.sha !== undefined){
    console.log(`All good ${repositoryName}`)
    return data.object.sha
  }else{
    console.log("ERROR GETTING SHA")
    return "error";
  }
}

export async function setUpdateButtonDisplay(upToDate:boolean, tooltip: string, repositories: Repository[]): Promise<{error: String, returncode:number}>{
  // Get widget
  const widget: HTMLElement | null = document.getElementById(widget_id);
  if(!widget){
    return {"error": "Unable to find nbgitpuller widget", "returncode": 1}
  }

  var buttonHTML
  // Update Contents
  if(upToDate){
    buttonHTML = `<span class="success">◉</span> Up to Date`;
  }else{
    buttonHTML = `<span class="failure">◉</span> Update Repos`;
  }
  
  widget.innerHTML = `
    <div class="lm-Widget jp-ToolbarButton nbgitpuller-jl-interface-wrapper"
         title="${tooltip}">
      <jp-button class="nbgitpuller-jl-interface-update-btn jp-ToolbarButtonComponent">
        ${buttonHTML}
      </jp-button
    </div>`;
  widget.addEventListener("click", async () => {
    console.log("CLICKED BUTTON");
    const failed_updates = await makeNbgitpullerRequest(repositories);
    console.log(`Failed to update the following repos: ${failed_updates}`);
  });

  return {"error":"", "returncode": 0}
}
