import { JupyterFrontEnd } from '@jupyterlab/application';

import { ToolbarButton } from '@jupyterlab/apputils';

import { find } from '@lumino/algorithm';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

// import { ServerConnection } from '@jupyterlab/services';
// import { PageConfig } from '@jupyterlab/coreutils';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';

const widget_id = 'nbgitpuller-jl-interface-update-btn';
let intervalID: ReturnType<typeof setInterval>;
let currentlyUpdating: boolean = false;

export interface IRepository {
  repoUrl: string;
  branch: string;
  destPath: string;
}

export async function nbgitpullerUpdateButton(
  app: JupyterFrontEnd,
  allSettings: ISettingRegistry.ISettings
): Promise<void> {
  console.log("Grooble1");
  const repositories = allSettings.get('repos')
    .composite as any as IRepository[];
  const rank = allSettings.get('rank').composite as number;

  // Remove previous button if exists
  const widget = find(app.shell.widgets('top'), w => w.id === widget_id);
  if (widget) {
    widget.dispose();
  }

  // Create widget
  const updateReposBtn = new ToolbarButton({
    className: 'nbgitpuller-jl-interface-update-btn',
    label: '◉ Initializing',
    tooltip: 'Initializing nbgitpuller'
  });
  updateReposBtn.id = widget_id;
  updateReposBtn.addClass('nbgitpuller-jl-interface-wrapper');
  // 1-899 left justified, 900+ right justified
  app.shell.add(updateReposBtn, 'top', { rank: rank });

  // Check for updates
  checkForUpdatesAndSetDisplay(repositories);

  console.log('nbgitpuller-jl-interface settings loaded');
}

export async function makeNbgitpullerRequest(
  repositories: IRepository[]
) {
  const baseUrl = PageConfig.getBaseUrl();
  console.log("TEST PRINT2")
  const url = URLExt.join(baseUrl, 'nbgitpuller-jl-interface', 'gitpuller');
  console.log(url);
  // const url =
  //   window.location.origin + baseUrl + 'nbgitpuller-jl-interface/gitpuller';
  const xsrfToken = document.cookie
    .split(';')
    .find(row => row.startsWith('_xsrf='))
    ?.split('=')[1];
  // Update repositories
  const failed_updates: { repo: string; reason: string }[] = [];
  for (const repo of repositories) {
    const repositoryUrl = repo['repoUrl'];
    const repositoryBranch = repo['branch'];
    const destination = repo['destPath'];

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
    const data = (await response.json()) as {
      output: string;
      error: string;
      returncode: number;
    };
    if (data['returncode'] !== 0) {
      failed_updates.push({ repo: repositoryUrl, reason: data['error'] });
    }
  }
  return failed_updates;
}

export async function repoUpdateProbe(
  allSettings: ISettingRegistry.ISettings
): Promise<void> {
  console.log("Flim1");
  const repositories = allSettings.get('repos')
    .composite as any as IRepository[];
  const probeInterval = allSettings.get('probeInterval').composite as number;

  console.log("Flim2");
  // Stop previous interval (if settings were changed)
  clearInterval(intervalID);

  console.log("Flim3");
  // Create interval
  intervalID = setInterval(async () => {
    checkForUpdatesAndSetDisplay(repositories);
  }, probeInterval);
  console.log("Flim4");
}

export async function checkForRepoUpdates(
  repositories: IRepository[]
): Promise<{
  response: { numToBeUpdated: number; numWithErrors: number };
  statuscode: number;
}> {
  let numToBeUpdated = 0;
  let numWithErrors = 0;
  // Check every repository
  for (const repo of repositories) {
    // Get relevant repository information
    const repositoryUrl = repo['repoUrl'];
    const repositoryBranch = repo['branch'];
    const destination = repo['destPath'];

    // Poll repo for any new commits
    const baseUrl = PageConfig.getBaseUrl();
    console.log("TEST PRINT")
    const url = URLExt.join(baseUrl, 'nbgitpuller-jl-interface', 'update-check');
    console.log(url);
    // const url =
    //   window.location.origin +
    //   baseUrl +
    //   'nbgitpuller-jl-interface/update-check';
    // console.log(url)
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

    if (data['returncode'] !== 0) {
      numWithErrors += 1;
    } else if (data['updatefound']) {
      numToBeUpdated += 1;
    }
  }

  return {
    response: {
      numToBeUpdated: numToBeUpdated,
      numWithErrors: numWithErrors
    },
    statuscode: 0
  };
}

export async function checkForUpdatesAndSetDisplay(
  repositories: IRepository[]
) {
  console.log("UPDATEDISP1")
  // Check for updates
  const repoUpdates = await checkForRepoUpdates(repositories);
  // Update display
  if (repoUpdates['statuscode'] === 0) {
    const updateCheckResponse = repoUpdates['response'] as {
      numToBeUpdated: number;
      numWithErrors: number;
    };
    // Generate tooltip
    let tooltip = '';
    if (
      updateCheckResponse['numToBeUpdated'] +
      updateCheckResponse['numWithErrors']
    ) {
      if (updateCheckResponse['numToBeUpdated']) {
        tooltip += `${updateCheckResponse['numToBeUpdated']} awaiting updates\n`;
      }
      if (updateCheckResponse['numWithErrors']) {
        tooltip += `${updateCheckResponse['numWithErrors']} repos with errors`;
      }
    } else {
      tooltip = `${repositories.length} Repos up to date`;
    }
    const updateDisplayResponse = await setUpdateButtonDisplay(
      updateCheckResponse['numToBeUpdated'] +
        updateCheckResponse['numWithErrors'] ===
        0,
      tooltip,
      repositories
    );
    if (updateDisplayResponse.returncode !== 0) {
      console.error(updateDisplayResponse);
    }
  }
}

export async function setUpdateButtonDisplay(
  upToDate: boolean,
  tooltip: string,
  repositories: IRepository[]
): Promise<{ error: string; returncode: number }> {
  // Get widget
  const widget: HTMLElement | null = document.getElementById(widget_id);
  if (!widget) {
    return { error: 'Unable to find nbgitpuller widget', returncode: 1 };
  }

  // Create button label html
  let labelHTML;
  if (upToDate) {
    labelHTML = '<p><span class="success">◉</span> Up to Date</p>';
  } else {
    labelHTML = '<p><span class="failure blink">◉</span> Update Repos</p>';
  }

  function generateWidgetHTML(tooltip: string, labelHTML: string): string {
    return `
    <div class="lm-Widget jp-ToolbarButton nbgitpuller-jl-interface-wrapper"
         title="${tooltip}">
      <jp-button class="nbgitpuller-jl-interface-update-btn jp-ToolbarButtonComponent">
        ${labelHTML}
      </jp-button>
    </div>`;
  }

  // Update widget functionality
  widget.innerHTML = generateWidgetHTML(tooltip, labelHTML);
  widget.addEventListener('click', async () => {
    // Throttle updating
    if (currentlyUpdating) {
      return;
    }
    // Set updating flag
    currentlyUpdating = true;
    // Update widget to running animation
    const pendingTooltip = 'Updating Repos...';
    const pendingLabelHTML =
      '<p><span class="lds-dual-ring"></span> Updating</p>';
    widget.innerHTML = generateWidgetHTML(pendingTooltip, pendingLabelHTML);

    // Pull each repository
    const failed_updates = await makeNbgitpullerRequest(repositories);

    // Update widget to all updated or pending updates
    checkForUpdatesAndSetDisplay(repositories);

    // Notify users of any failure
    if (failed_updates.length !== 0) {
      let failure_message = 'Failed to update the following repos: \n';
      for (const failure of failed_updates) {
        failure_message += `${failure['repo']}`;
      }
      console.log(failure_message);
      alert(failure_message);
    }

    // Unset updating flag
    currentlyUpdating = false;
  });

  return { error: '', returncode: 0 };
}
