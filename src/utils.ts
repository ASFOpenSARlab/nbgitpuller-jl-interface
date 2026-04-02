import { JupyterFrontEnd } from '@jupyterlab/application';

import { ToolbarButton } from '@jupyterlab/apputils';

import { find } from '@lumino/algorithm';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

const widget_id = 'nbgitpuller-jl-interface-update-btn';
var intervalID = 0;

export interface Repository{
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
  const repoUpdates = await checkForRepoUpdates(repositories);
  if(repoUpdates["statuscode"] == 0){
    const updateCheckResponse = repoUpdates["response"] as {numToBeUpdated:number, numWithErrors:number};
    const tooltip = `${updateCheckResponse["numToBeUpdated"]} awaiting updates\n${updateCheckResponse["numWithErrors"]} repos with errors`;
    const updateDisplayResponse = await setUpdateButtonDisplay(updateCheckResponse["numToBeUpdated"]+updateCheckResponse["numWithErrors"] == 0, tooltip, repositories);
    if(updateDisplayResponse.returncode != 0){
      console.error(updateDisplayResponse);
    }
  }

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
    const repositoryUrl = repo["repoUrl"]
    const repositoryBranch = repo["branch"]
    const destination = repo["destPath"]

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRFToken': xsrfToken ?? ''
      },
      body: JSON.stringify({
        repositoryUrl: repositoryUrl,
        repositoryBranch: repositoryBranch,
        destination: destination
      })
    });
    const data = await response.json() as { result: {output: string, error: string, returncode: number} };
    if (data["result"]["returncode"] != 0){
      failed_updates.push(repositoryUrl);
    }
  }
  return failed_updates;
}

export async function repoUpdateProbe(allSettings: ISettingRegistry.ISettings): Promise<void>{
  const repositories = allSettings.get('repos').composite as any as Repository[];
  const probeInterval = allSettings.get('probeInterval').composite as number;

  // Stop previous interval (if settings were changed)
  clearInterval(intervalID);

  // Create interval
  intervalID = setInterval(async () => {
    const repoUpdates = await checkForRepoUpdates(repositories);
    if(repoUpdates["statuscode"] == 0){
      const updateCheckResponse = repoUpdates["response"] as {numToBeUpdated:number, numWithErrors:number};
      const tooltip = `${updateCheckResponse["numToBeUpdated"]} awaiting updates\n${updateCheckResponse["numWithErrors"]} repos with errors`;
      const updateDisplayResponse = await setUpdateButtonDisplay(updateCheckResponse["numToBeUpdated"]+updateCheckResponse["numWithErrors"] == 0, tooltip, repositories);
      if(updateDisplayResponse.returncode != 0){
        console.error(updateDisplayResponse);
      }
    }
  }, probeInterval);
}

export async function checkForRepoUpdates(repositories: Repository[]): Promise<{response: {}, statuscode: number}>{
  var numToBeUpdated = 0;
  var numWithErrors = 0;
  // Check every repository
  for (var repo of repositories){
    // Get relevant repository information
    const repositoryUrl = repo["repoUrl"]
    const repositoryBranch = repo["branch"]
    const destination = repo["destPath"]

    // Poll repo for any new commits
    const url = window.location.origin + '/nbgitpuller-jl-interface/update-check';
    const xsrfToken = document.cookie
      .split(';')
      .find(row => row.startsWith('_xsrf='))
      ?.split('=')[1];
    const needUpdate = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRFToken': xsrfToken ?? ''
    },
    body: JSON.stringify({
        repositoryUrl: repositoryUrl,
        repositoryBranch: repositoryBranch,
        destination: destination
      })
    });
    const data = await needUpdate.json();
    console.log(JSON.stringify(data));
    if(data["returncode"] !== 0){
      numWithErrors += 1;
    }
    else if(data["updatefound"]){
      console.log(data["updatefound"]);
      numToBeUpdated += 1;
    }
  }

  // const tooltip = `${numToBeUpdated} awaiting updates\n${numWithErrors} repos with errors`;
  // const response = await setUpdateButtonDisplay(numToBeUpdated+numWithErrors == 0, tooltip, repositories)
  // if(response.returncode != 0){
  //   console.error(response)
  // }
  console.log(`Update: ${numToBeUpdated} Errors: ${numWithErrors}`)
  return {
    "response": {
      "numToBeUpdated": numToBeUpdated,
      "numWithErrors": numWithErrors,
    },
    "statuscode": 0
  }
}

export async function getMostRecentRepoHash(
  repositoryName: string,
  repositoryOwner: string,
  branch: string,
): Promise<string>{
  const url = `https://api.repository.com/repos/${repositoryOwner}/${repositoryName}/git/ref/heads/${branch}`;
  const headers = {
    "Accept": "application/vnd.repository+json"
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
    buttonHTML = `<span class="failure blink">◉</span> Update Repos`;
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
