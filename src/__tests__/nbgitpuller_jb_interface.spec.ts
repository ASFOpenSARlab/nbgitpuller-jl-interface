/**
 * Example of [Jest](https://jestjs.io/docs/getting-started) unit tests
 */
import {
  describe,
  expect,
  beforeEach,
  afterEach,
  jest,
  it
} from '@jest/globals';

import {
  checkForRepoUpdates,
  setUpdateButtonDisplay,
  WidgetState
} from '../utils';

describe('nbgitpuller-jl-interface utils checkForRepoUpdates', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('one update', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementationOnce(
      async () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              returncode: 0,
              updatefound: true,
              repoexists: true
            }),
          status: 200
        }) as unknown as Response
    );

    const returnValue = await checkForRepoUpdates([
      { repoUrl: 'https://fakerepo.com', branch: 'main', destPath: 'mypath' }
    ]);

    expect(returnValue).toStrictEqual({
      response: { numToBeUpdated: 1, numWithErrors: 0 },
      statuscode: 0
    });
  });

  it('one error', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementationOnce(
      async () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              returncode: 1,
              updatefound: true,
              repoexists: true
            }),
          status: 200
        }) as unknown as Response
    );

    // const returnValue = await fetch("https://aaagaag.com")
    const returnValue = await checkForRepoUpdates([
      { repoUrl: 'https://fakerepo.com', branch: 'main', destPath: 'mypath' }
    ]);

    expect(returnValue).toStrictEqual({
      response: { numToBeUpdated: 0, numWithErrors: 1 },
      statuscode: 0
    });
  });

  it('mixed return', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(
        async () =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                returncode: 0,
                updatefound: true,
                repoexists: true
              }),
            status: 200
          }) as unknown as Response
      )
      .mockImplementationOnce(
        async () =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                returncode: 1,
                updatefound: false,
                repoexists: true
              }),
            status: 200
          }) as unknown as Response
      )
      .mockImplementationOnce(
        async () =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                returncode: 0,
                updatefound: true,
                repoexists: true
              }),
            status: 200
          }) as unknown as Response
      );

    // const returnValue = await fetch("https://aaagaag.com")
    const returnValue = await checkForRepoUpdates([
      { repoUrl: 'https://fakerepo.com', branch: 'main', destPath: 'mypath' },
      { repoUrl: 'https://fakerepo.com', branch: 'main', destPath: 'mypath' },
      { repoUrl: 'https://fakerepo.com', branch: 'main', destPath: 'mypath' }
    ]);
    expect(returnValue).toStrictEqual({
      response: { numToBeUpdated: 2, numWithErrors: 1 },
      statuscode: 0
    });
  });
});

describe('nbgitpuller-jl-interface utils setUpdateButtonDisplay', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('widget up to date success', async () => {
    const widget = await document.createElement('div');
    widget.id = 'nbgitpuller-jl-interface-update-btn';
    document.body.appendChild(widget);

    const returnValue = await setUpdateButtonDisplay(WidgetState.UpToDate, '');

    expect(returnValue).toStrictEqual({ error: '', returncode: 0 });
    expect(widget.innerHTML).toContain(`<span class="success">◉</span>`);
  });

  it('widget update required', async () => {
    const widget = await document.createElement('div');
    widget.id = 'nbgitpuller-jl-interface-update-btn';
    document.body.appendChild(widget);

    const returnValue = await setUpdateButtonDisplay(
      WidgetState.UpdateRequired,
      ''
    );

    expect(returnValue).toStrictEqual({ error: '', returncode: 0 });
    expect(widget.innerHTML).toContain(`<span class="pending blink">◉</span>`);
  });

  it('widget error', async () => {
    const widget = await document.createElement('div');
    widget.id = 'nbgitpuller-jl-interface-update-btn';
    document.body.appendChild(widget);

    const returnValue = await setUpdateButtonDisplay(WidgetState.Error, '');

    expect(returnValue).toStrictEqual({ error: '', returncode: 0 });
    expect(widget.innerHTML).toContain(`<span class="failure blink">◉</span>`);
  });

  it('widget not found', async () => {
    const returnValue = await setUpdateButtonDisplay(WidgetState.Error, '');

    expect(returnValue).toStrictEqual({
      error: 'Unable to find nbgitpuller widget',
      returncode: 1
    });
  });
});
