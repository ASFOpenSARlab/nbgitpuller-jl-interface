import { JupyterFrontEnd } from '@jupyterlab/application';

import { find } from '@lumino/algorithm';

import { Widget } from '@lumino/widgets';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { Instance, Props } from 'tippy.js';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

export const widget_id = 'nbgitpuller-jl-interface-update-btn';
let intervalID: ReturnType<typeof setInterval>;
let currentlyUpdating: boolean = false;
let nbgitpullerButtonTooltip: Instance<Props>;

export interface IRepository {
  repoUrl: string;
  branch: string;
  destPath: string;
}

export async function pullRepos(repositories: IRepository[]): Promise<void> {
  // Pull each repository
  const failed_updates = await makeNbgitpullerRequest(repositories);

  // Update widget to all updated or pending updates
  await checkForUpdatesAndSetDisplay(repositories);

  // Notify users of any failure
  if (failed_updates.length !== 0) {
    let failure_message = 'Failed to update the following repositories: \n';
    for (const failure of failed_updates) {
      failure_message += `- ${failure['repo']}\n`;
    }
    failure_message +=
      'If you require assistance with resolving this issue, please contact your platform administrators.';
    console.log(failure_message);
    alert(failure_message);
  }
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
    const pendingTooltip = 'Updating GitHub Repositories...';
    await setUpdateButtonDisplay(WidgetState.Updating, pendingTooltip);

    await pullRepos(repositories);

    // Unset updating flag
    currentlyUpdating = false;
  });

  // 1-899 left justified, 900+ right justified
  app.shell.add(newWidget, 'top', { rank: rank });

  nbgitpullerButtonTooltip = tippy(`#${widget_id}`, {
    content: '<p>Tooltip Created</p>',
    allowHTML: true,
    theme: 'light',
    placement: 'bottom',
    interactive: true,
    maxWidth: 1000 // Resizes width to any non-wrapping text
  })[0];

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
  response: { reposToBeUpdated: IRepository[]; reposWithErrors: IRepository[] };
  statuscode: number;
}> {
  const reposToBeUpdated: IRepository[] = [];
  const reposWithErrors: IRepository[] = [];
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
      reposWithErrors.push(repo);
    } else if (data['updatefound']) {
      reposToBeUpdated.push(repo);
    }
  }

  return {
    response: {
      reposToBeUpdated: reposToBeUpdated,
      reposWithErrors: reposWithErrors
    },
    statuscode: 0
  };
}

// Inline styles for Tippy tooltip
// Computed css styles are not loading for some reason
function createURLHTML(
  url: string,
  text: string,
  newTab: boolean = true
): string {
  const urlInlineStyle =
    'white-space: nowrap; text-decoration-line: underline; color: #0000EE;';
  const target = newTab ? ' target="_blank"' : '';
  return `<p><a href="${url}"${target} style="${urlInlineStyle}">${text}</a></p>`;
}

export async function checkForUpdatesAndSetDisplay(
  repositories: IRepository[]
) {
  // Check for updates
  const repoUpdates = await checkForRepoUpdates(repositories);

  // Update display
  if (repoUpdates['statuscode'] === 0) {
    const updateCheckResponse = repoUpdates['response'] as {
      reposToBeUpdated: IRepository[];
      reposWithErrors: IRepository[];
    };

    // Generate tooltip
    let tooltip;
    let widgetState;

    if (updateCheckResponse['reposWithErrors'].length > 0) {
      let erroringRepos = '';
      for (const repo of updateCheckResponse['reposWithErrors']) {
        erroringRepos += createURLHTML(repo.repoUrl, repo.repoUrl);
      }

      tooltip = `
      <div style="text-align: center;">
        <p>${updateCheckResponse['reposWithErrors'].length} repositories with errors</p>
        ${erroringRepos}
      </div>
      `;
      widgetState = WidgetState.Error;
    } else if (updateCheckResponse['reposToBeUpdated'].length > 0) {
      let toUpdateRepos = '';
      for (const repo of updateCheckResponse['reposToBeUpdated']) {
        toUpdateRepos += createURLHTML(repo.repoUrl, repo.repoUrl);
      }

      tooltip = `
      <div style="text-align: center;">
        <p>${updateCheckResponse['reposToBeUpdated'].length} repositories awaiting updates</p>
        ${toUpdateRepos}
      </div>
      `;
      widgetState = WidgetState.UpdateRequired;
    } else {
      tooltip = `
      <div>
        <p>${repositories.length} repositories up to date</p>
      </div>
      `;
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
    nbgitpullerButtonTooltip.setContent(tooltip);
    return `
      <jp-button class="nbgitpuller-jl-interface-update-btn jp-ToolbarButtonComponent">
        ${labelHTML}
      </jp-button>`;
  }

  // Update widget functionality
  widget.innerHTML = generateWidgetHTML(labelHTML);

  return { error: '', returncode: 0 };
}
