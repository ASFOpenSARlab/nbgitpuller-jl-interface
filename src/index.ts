import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { nbgitpullerUpdateButton, repoUpdateProbe } from './utils';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { ICommandPalette } from '@jupyterlab/apputils';

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
  optional: [],
  requires: [
    ILabShell,
    ICommandPalette,
    ISettingRegistry,
    JupyterFrontEnd.IPaths
  ],
  activate: (
    app: JupyterFrontEnd,
    shell: ILabShell,
    palette: ICommandPalette,
    settingRegistry: ISettingRegistry | null,
    paths: JupyterFrontEnd.IPaths
  ) => {
    // Wait for the application to be restored and
    // for the settings for this plugin to be loaded
    if (!settingRegistry) {
      console.log(
        'Settings not found. nbgitpuller-jl-interface cannot be established.'
      );
      return;
    }

    // Initialize buttons
    Promise.all([app.restored, settingRegistry.load(plugin.id)])
      .then(async ([, settings]) => {
        // reloadWidget on extension loading
        await settings.set('reloadWidget', true);

        async function loadSettings(
          allSettings: ISettingRegistry.ISettings
        ): Promise<void> {
          const reloadWidget = allSettings.get('reloadWidget')
            .composite as boolean;

          if (reloadWidget) {
            await nbgitpullerUpdateButton(app, allSettings);
            await repoUpdateProbe(allSettings);
            await allSettings.set('reloadWidget', false);
          }
        }

        // Read the settings
        loadSettings(settings);

        // Listen for your plugin setting changes using Signal
        settings.changed.connect(loadSettings);

        console.log(
          'JupyterLab extension nbgitpuller-jl-interface is fully operational!'
        );
      })
      .catch(reason => {
        console.error(`Something went wrong...${reason}`);
      });

    console.log('JupyterLab extension nbgitpuller-jl-interface is activated!');
  }
};

export default plugin;
