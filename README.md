# Zax Dashboard

[![dependency Status](https://david-dm.org/ismaestro/angular8-example-app.svg)](https://david-dm.org/vault12/zax-dash#info=dependencies)
[![devDependency Status](https://david-dm.org/ismaestro/angular8-example-app/dev-status.svg)](https://david-dm.org/vault12/zax-dash#info=devDependencies)
[![demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://vault12.github.io/zax-dashboard/)

**Zax Dashboard** is a simple [Angular](https://angular.io) single page app to interact with [Zax Relay](https://github.com/vault12/zax), a [NaCl-based Cryptographic Relay](https://s3-us-west-1.amazonaws.com/vault12/zax_infogfx.jpg). Zax Dashboard uses the [Glow](https://github.com/vault12/glow) library to provide a user-friendly access point to given relay internal mailboxes. We maintain a live [Test Server](https://zax-test.vault12.com) that runs our latest build. For testing purposes expiration of any communication on that relay is set for 30 minutes. You can read the full [technical specification here](http://bit.ly/nacl_relay_spec).

## Getting started

### NodeJS

In order to build and use Zax-Dash from source, you need to have a relatively recent version of NodeJS installed.

### Installation

In a terminal, navigate to the directory in which you'd like to install Zax Dashboard and type the following:

```Shell
# get the source
git clone git@github.com:vault12/zax-dashboard.git

# install dependencies
cd zax-dashboard
npm install

# run the dev server
ng serve
```

Then navigate to `http://localhost:4200/` in your browser. The app will automatically reload if you change any of the source files.

## Build

Run `npm run dist` to build the project. The build artifacts will be stored in the `docs/` directory, which serves as a root for Github Pages.

## License

Zax Dashboard is released under the [MIT License](http://opensource.org/licenses/MIT).

## Legal Reminder

Exporting/importing and/or use of strong cryptography software, providing cryptography hooks, or even just communicating technical details about cryptography software is illegal in some parts of the world. If you import this software to your country, re-distribute it from there or even just email technical suggestions or provide source patches to the authors or other people you are strongly advised to pay close attention to any laws or regulations which apply to you. The authors of this software are not liable for any violations you make - it is your responsibility to be aware of and comply with any laws or regulations which apply to you.
