import { JupyterFrontEnd } from '@jupyterlab/application';

import { find } from '@lumino/algorithm';

import { Widget } from '@lumino/widgets';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

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
  const repositories = allSettings.get('repos')
    .composite as any as IRepository[];
  const rank = allSettings.get('rank').composite as number;

  // Remove previous button if exists
  const widget = find(app.shell.widgets('top'), w => w.id === widget_id);
  if (widget) {
    widget.dispose();
  }

  const newWidget = new Widget();
  newWidget.id = widget_id;
  newWidget.addClass('lm-Widget');
  newWidget.addClass('jp-ToolbarButton');
  newWidget.addClass('nbgitpuller-jl-interface-wrapper');
  newWidget.node.addEventListener('click', async () => {
    // Throttle updating
    if (currentlyUpdating) {
      return;
    }
    // Set updating flag
    currentlyUpdating = true;

    // Update widget to running animation
    const pendingTooltip = 'Updating Repositories...';
    await setUpdateButtonDisplay(WidgetState.Updating, pendingTooltip);

    // Pull each repository
    const failed_updates = await makeNbgitpullerRequest(repositories);

    // Update widget to all updated or pending updates
    await checkForUpdatesAndSetDisplay(repositories);

    // Notify users of any failure
    if (failed_updates.length !== 0) {
      let failure_message = 'Failed to update the following repositories: \n';
      for (const failure of failed_updates) {
        failure_message += `${failure['repo']}`;
      }
      console.log(failure_message);
      alert(failure_message);
    }

    // Unset updating flag
    currentlyUpdating = false;
  });

  // 1-899 left justified, 900+ right justified
  app.shell.add(newWidget, 'top', { rank: rank });

  // Wait one second for initial creation timing
  await new Promise(f => setTimeout(f, 1000));

  // Check for updates
  await checkForUpdatesAndSetDisplay(repositories);

  console.log('nbgitpuller-jl-interface settings loaded');
}

export async function makeNbgitpullerRequest(repositories: IRepository[]) {
  const baseUrl = PageConfig.getBaseUrl();
  const url = URLExt.join(baseUrl, 'nbgitpuller-jl-interface', 'gitpuller');
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
  const repositories = allSettings.get('repos')
    .composite as any as IRepository[];
  const probeInterval = allSettings.get('probeInterval').composite as number;

  // Stop previous interval (if settings were changed)
  clearInterval(intervalID);

  // Create interval
  intervalID = setInterval(async () => {
    await checkForUpdatesAndSetDisplay(repositories);
  }, probeInterval);
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
    const url = URLExt.join(
      baseUrl,
      'nbgitpuller-jl-interface',
      'update-check'
    );
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
  // Check for updates
  const repoUpdates = await checkForRepoUpdates(repositories);

  // Update display
  if (repoUpdates['statuscode'] === 0) {
    const updateCheckResponse = repoUpdates['response'] as {
      numToBeUpdated: number;
      numWithErrors: number;
    };

    // Generate tooltip
    let tooltip;
    let widgetState;
    if (updateCheckResponse['numWithErrors'] > 0) {
      tooltip = `${updateCheckResponse['numWithErrors']} repositories with errors`;
      widgetState = WidgetState.Error;
    } else if (updateCheckResponse['numToBeUpdated'] > 0) {
      tooltip = `${updateCheckResponse['numToBeUpdated']} repositories awaiting updates\n`;
      widgetState = WidgetState.UpdateRequired;
    } else {
      tooltip = `${repositories.length} repositories up to date`;
      widgetState = WidgetState.UpToDate;
    }

    const updateDisplayResponse = await setUpdateButtonDisplay(
      widgetState,
      tooltip
    );
    if (updateDisplayResponse.returncode !== 0) {
      console.error(updateDisplayResponse);
    }
  }
}

export enum WidgetState {
  UpToDate,
  UpdateRequired,
  Updating,
  Error,
  Initializing
}

export async function setUpdateButtonDisplay(
  targetWidgetState: WidgetState,
  tooltip: string
): Promise<{ error: string; returncode: number }> {
  // Get widget
  const widget: HTMLElement | null = document.getElementById(widget_id);
  if (!widget) {
    return { error: 'Unable to find nbgitpuller widget', returncode: 1 };
  }

  // Create button label html
  let labelHTML;
  if (targetWidgetState === WidgetState.UpToDate) {
    labelHTML = '<p><span class="success">◉</span> Up to Date</p>';
  } else if (targetWidgetState === WidgetState.Updating) {
    labelHTML = '<p><span class="lds-dual-ring"></span> Updating</p>';
  } else if (targetWidgetState === WidgetState.UpdateRequired) {
    labelHTML =
      '<p><span class="pending blink">◉</span> Update Repositories</p>';
  } else if (targetWidgetState === WidgetState.Error) {
    labelHTML = '<p><span class="failure blink">◉</span> Update Error</p>';
  } else if (targetWidgetState === WidgetState.Initializing) {
    labelHTML = '<p><span class="">◉</span> Initializing</p>';
  } else {
    return { error: 'Unknown widget state', returncode: 2 };
  }

  function generateWidgetHTML(labelHTML: string): string {
    return `
      <jp-button class="nbgitpuller-jl-interface-update-btn jp-ToolbarButtonComponent">
        ${labelHTML}
      </jp-button>`;
  }

  // Update widget functionality
  widget.title = tooltip;
  widget.innerHTML = generateWidgetHTML(labelHTML);

  return { error: '', returncode: 0 };
}
