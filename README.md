# nbgitpuller_jl_interface

[![Github Actions Status](https://github.com/ASFOpenSARlab/nbgitpuller-jl-interface/workflows/Build/badge.svg)](https://github.com/ASFOpenSARlab/nbgitpuller-jl-interface/actions/workflows/build.yml)

A human interface with nbgitpuller in JupyterBook

This extension is composed of a Python package named `nbgitpuller_jl_interface`
for the server extension and a NPM package named `nbgitpuller-jl-interface`
for the frontend extension.

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install nbgitpuller_jl_interface
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall nbgitpuller_jl_interface
```

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```

## Contributing

If you would like to contribute to this extension, please refer to the [Contributing Guide](CONTRIBUTING.md).
