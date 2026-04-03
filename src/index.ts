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
  requires: [ILabShell, ICommandPalette, ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    shell: ILabShell,
    palette: ICommandPalette,
    settingRegistry: ISettingRegistry | null,
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
      .then(([, settings]) => {
        async function loadSettings(
          allSettings: ISettingRegistry.ISettings
        ): Promise<void> {
          const reloadWidget = allSettings.get('reloadWidget').composite as boolean;
          if(reloadWidget){
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


















    // // console.log('JupyterLab extension nbgitpuller-jl-interface is activated!');
    // const { commands } = app;
    // let repos = []

    // function loadSetting(setting: ISettingRegistry.ISettings): void{
    //   repos = setting.get("repos").composite as string[];
    //   console.log(`Loaded settings\n    repos:${repos}`)
    // }

    // // console.log(`nbgitpuller-jl-extension ${inspect(settingRegistry)}`)

    // if (settingRegistry) {
    //   settingRegistry
    //     .load(plugin.id)
    //     .then(settings => {
    //       loadSetting(settings);

    //       settings.changed.connect(loadSetting);

    //       console.log(
    //         'nbgitpuller-jl-interface settings loaded:',
    //         settings.composite
    //       );
    //     })
    //     .catch(reason => {
    //       console.error(
    //         'Failed to load settings for nbgitpuller-jl-interface.',
    //         reason
    //       );
    //     });
    // }


    // // Add update-all-repos command
    // const command = 'nbgitpuller:update-all-repos';
    // commands.addCommand(command,{
    //   "label": "Update all notebook",
    //   "caption": "Update all notebook",
    //   execute: async (args: any) => {
    //     console.log(`grooble ${JSON.stringify(args)}`)
    //     const resp = await makeNbgitpullerRequest(
    //       'https://github.com/ASFOpenSARlab/opensarlab-notebooks.git',
    //       'notebooks',
    //       'master'
    //     );
    //     console.log(`response data: ${JSON.stringify(resp)}`);
    //   }
    // })

    // // Add update-all-repos command
    // const command2 = 'nbgitpuller:add-repo';
    // commands.addCommand(command2,{
    //   "label": "Update repos list",
    //   "caption": "Update repos list",
    //   execute: (args: any) => {
    //     const newRepo = args["repo"]
    //     settingRegistry
    //       ?.load(plugin.id)
    //       .then(settings => {
    //         settings.set("repos", repos.push(newRepo))
    //       })
    //   }
    // })

    // const category = "Extension Examples"
    // palette.addItem({
    //   command,
    //   category,
    //   args: {origin: "from pallete"}
    // });

    // // requestAPI<any>('hello', app.serviceManager.serverSettings)
    // //   .then(data => {
    // //     console.log(data);
    // //   })
    // //   .catch(reason => {
    // //     console.error(
    // //       `The nbgitpuller_jl_interface server extension appears to be missing.\n${reason}`
    // //     );
    // //   });

    // // const widget = new Widget();
    // // widget.id = '@jupyterlab-sidepanel/nbgitpuller-jl-interface';
    // // widget.title.iconClass = 'lm-MenuBar-itemLabel';
    // // widget.title.className = 'jbook-tab';
    // // widget.title.caption = 'NBGitpuller';

    // // const gitpullerBtn = document.createElement('button');
    // // gitpullerBtn.innerHTML = 'Update2';
    // // gitpullerBtn.onclick = async () => {
    // //   const resp = await makeNbgitpullerRequest(
    // //     'https://github.com/ASFOpenSARlab/opensarlab-notebooks.git',
    // //     'notebooks',
    // //     'master'
    // //   );
    // //   console.log(`response data: ${JSON.stringify(resp)}`);
    // // };
    // // widget.node.appendChild(gitpullerBtn);

    // // shell.add(widget, 'top', { rank: 40 });
    // // widget.activate();
  }
};

export default plugin;
