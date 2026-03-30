import { JupyterFrontEnd } from '@jupyterlab/application';

import { ToolbarButton } from '@jupyterlab/apputils';

import { find } from '@lumino/algorithm';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

export async function nbgitpullerUpdateButton(
  app: JupyterFrontEnd,
  allSettings: ISettingRegistry.ISettings,
): Promise<void>{
  const repositories = allSettings.get('repos').composite as { repoUrl:string, branch:string, destPath: string }[];
  const rank = allSettings.get('rank').composite as number;

  const widget_id = 'nbgitpuller-jl-interface-update-btn';

  // Remove previous button if exists
  const widget = find(app.shell.widgets('top'), w => w.id === widget_id)
  if(widget){
    widget.dispose();
  }

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
  console.log('nbgitpuller-jl-interface settings loaded');
}

export async function makeNbgitpullerRequest(
  repositories: { repoUrl:string, branch:string, destPath: string }[],
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

export async function checkForRepoUpdates(
  repositoryName: string,
  repositoryOwner: string,
  branch: string,
  previousSHA: string,
): Promise<string>{
  const url = `https://api.github.com/repos/${repositoryOwner}/${repositoryName}/branches/${branch}`;

  const response = await fetch(url);
  console.log(response)

  return "ooblegooble"
}
