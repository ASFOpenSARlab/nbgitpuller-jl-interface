import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { requestAPI } from './request';

/**
 * Initialization data for the nbgitpuller-jb-interface extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'nbgitpuller-jb-interface:plugin',
  description: 'A human interface with nbgitpuller in JupyterBook',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension nbgitpuller-jb-interface is activated!');

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('nbgitpuller-jb-interface settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for nbgitpuller-jb-interface.', reason);
        });
    }

    requestAPI<any>('hello', app.serviceManager.serverSettings)
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The nbgitpuller_jb_interface server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
