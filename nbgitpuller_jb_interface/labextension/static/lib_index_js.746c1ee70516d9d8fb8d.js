"use strict";
(self["webpackChunknbgitpuller_jb_interface"] = self["webpackChunknbgitpuller_jb_interface"] || []).push([["lib_index_js"],{

/***/ "./lib/index.js"
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   getJupyterAppInstance: () => (/* binding */ getJupyterAppInstance)
/* harmony export */ });
/* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/application */ "webpack/sharing/consume/default/@jupyterlab/application");
/* harmony import */ var _jupyterlab_application__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_application__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @lumino/widgets */ "webpack/sharing/consume/default/@lumino/widgets");
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_lumino_widgets__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @jupyterlab/settingregistry */ "webpack/sharing/consume/default/@jupyterlab/settingregistry");
/* harmony import */ var _jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_2__);



// import { requestAPI } from './request';
/**
 * Initialization data for the nbgitpuller-jb-interface extension.
 */
let appInstance = null;
function getJupyterAppInstance(app) {
    if (!appInstance && app) {
        appInstance = app;
    }
    if (!appInstance) {
        throw new Error('App instance has not been initialized yet');
    }
    return appInstance;
}
const plugin = {
    id: 'nbgitpuller-jb-interface:plugin',
    description: 'A human interface with nbgitpuller in JupyterBook',
    autoStart: true,
    optional: [_jupyterlab_settingregistry__WEBPACK_IMPORTED_MODULE_2__.ISettingRegistry],
    requires: [_jupyterlab_application__WEBPACK_IMPORTED_MODULE_0__.ILabShell],
    activate: (app, shell, settingRegistry) => {
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
        // requestAPI<any>('hello', app.serviceManager.serverSettings)
        //   .then(data => {
        //     console.log(data);
        //   })
        //   .catch(reason => {
        //     console.error(
        //       `The nbgitpuller_jb_interface server extension appears to be missing.\n${reason}`
        //     );
        //   });
        console.log("Grooble");
        const widget = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_1__.Widget();
        widget.id = '@jupyterlab-sidepanel/nbgitpuller-jb-interface';
        widget.title.iconClass = 'jbook-icon2 jp-SideBar-tabIcon';
        widget.title.className = 'jbook-tab';
        widget.title.caption = 'NBGitpuller';
        const summary = document.createElement('p');
        summary.innerHTML = "This is a thing.";
        widget.node.appendChild(summary);
        shell.add(widget, 'left', { rank: 400 });
        widget.activate();
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (plugin);


/***/ }

}]);
//# sourceMappingURL=lib_index_js.746c1ee70516d9d8fb8d.js.map