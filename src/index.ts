import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { makeNbgitpullerRequest } from './utils'

import { Widget } from '@lumino/widgets';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

// import { requestAPI } from './request';

/**
 * Initialization data for the nbgitpuller-jl-interface extension.
 */

let appInstance: JupyterFrontEnd | null = null;

export function getJupyterAppInstance(app?: JupyterFrontEnd): JupyterFrontEnd {
  if (!appInstance && app) {
    appInstance = app;
  }
  if (!appInstance) {
    throw new Error('App instance has not been initialized yet');
  }
  return appInstance;
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'nbgitpuller-jl-interface:plugin',
  description: 'A human interface with nbgitpuller in JupyterBook',
  autoStart: true,
  optional: [ISettingRegistry],
  requires: [ILabShell],
  activate: (app: JupyterFrontEnd, shell: ILabShell, settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension nbgitpuller-jl-interface is activated!');

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('nbgitpuller-jl-interface settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for nbgitpuller-jl-interface.', reason);
        });
    }

    // requestAPI<any>('hello', app.serviceManager.serverSettings)
    //   .then(data => {
    //     console.log(data);
    //   })
    //   .catch(reason => {
    //     console.error(
    //       `The nbgitpuller_jl_interface server extension appears to be missing.\n${reason}`
    //     );
    //   });

    const widget = new Widget();
    widget.id = '@jupyterlab-sidepanel/nbgitpuller-jl-interface';
    widget.title.iconClass = 'jbook-icon2 jp-SideBar-tabIcon';
    widget.title.className = 'jbook-tab';
    widget.title.caption = 'NBGitpuller';

    const gitpullerBtn = document.createElement('button');
    gitpullerBtn.innerHTML = "Update";
    gitpullerBtn.onclick = async () => {
      const resp = await makeNbgitpullerRequest(
        "https://github.com/ASFOpenSARlab/opensarlab-notebooks.git",
        "notebooks",
        "master",
      );
      console.log(`response data: ${JSON.stringify(resp)}`);
    }
    widget.node.appendChild(gitpullerBtn);

    shell.add(widget, 'left', { rank: 400 });
    widget.activate();
  }
};

export default plugin;
