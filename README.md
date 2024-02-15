# Zax Dashboard

<p align="center">
  <img src="https://user-images.githubusercontent.com/1370944/121530189-d7da7e80-ca05-11eb-9242-c564547b425a.jpg"
    alt="Vault12 Zax Dashboard">
</p>

<p align="center">
  <a href="https://github.com/vault12/zax-dashboard/actions/workflows/ci.yml">
    <img src="https://github.com/vault12/zax-dashboard/actions/workflows/ci.yml/badge.svg" alt="Github Actions Build Status" />
  </a>
  <a href="https://vault12.github.io/zax-dashboard/">
    <img src="https://img.shields.io/badge/demo-online-orange" alt="Demo Online" />
  </a>
  <a href="https://npmjs.com/package/zax-dashboard">
    <img src="https://img.shields.io/npm/v/zax-dashboard" alt="NPM Package" />
  </a>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" />
  </a>
  <a href="http://makeapullrequest.com">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome" />
  </a>
  <a href="https://twitter.com/_Vault12_">
    <img src="https://img.shields.io/twitter/follow/_Vault12_?label=Follow&style=social" alt="Follow" />
  </a>
</p>

**Zax Dashboard** is a simple single page web app powered by [Angular](https://angular.io), introducing typical interactions with [Zax Relay](https://github.com/vault12/zax), a [NaCl-based Cryptographic Relay](https://s3-us-west-1.amazonaws.com/vault12/zax_infogfx.jpg). **Zax Dashboard** uses the [Glow.ts](https://github.com/vault12/glow.ts) library to provide a user-friendly access point to encrypted Mailboxes on a given relay. You can read the full [technical specification here](http://bit.ly/nacl_relay_spec).

## Demo

We maintain a live [Test Server](https://zt.vault12.com) that runs the stable build of Zax Dashboard. For testing purposes expiration of any communication on that relay is set to *30 minutes*.

You can also check the latest build of `master` branch on [Github Pages](https://vault12.github.io/zax-dashboard/).

## Features

- Create mailboxes
- Send and receive end-to-end encrypted messages between mailboxes
- Send and receive encrypted files via [Zax 2.0 File Commands](https://github.com/vault12/zax/wiki/Zax-2.0-File-Commands)
- Switch Zax relays on the fly

## Getting started

### Node.js

In order to build and use **Zax Dashboard** from source, you need to have a relatively recent version of [Node.js](https://nodejs.org) installed.

### Installation

In a terminal, navigate to the directory in which you'd like to install **Zax Dashboard** and type the following:

```Shell
# get the source
git clone git@github.com:vault12/zax-dashboard.git

# install dependencies
cd zax-dashboard
npm install

# run the dev server
npm run start
```

Then navigate to `http://localhost:4200` in your browser. The app will automatically reload if you change any of the source files.

## Configuration

To change the default relay, modify private `setDefaultRelay()` method of [app.component.ts](https://github.com/vault12/zax-dashboard/blob/master/src/app/app.component.ts). By default, it uses the same domain where Zax Dashboard is running, but falls back to our test server when run on *localhost* or *Github Pages*.

## Build

Run `npm run dist` to build the project. The build artifacts will be stored in the `dist/` directory. The `docs/` directory which serves as a root for [Github Pages](https://vault12.github.io/zax-dashboard/) can be built with `npm run github-pages`.

## Ecosystem

Project | Description
--- | ---
[Zax](https://github.com/vault12/zax) | NaCl-based Cryptographic Relay
[Glow](https://github.com/vault12/glow.ts) | Client library for interacting with Zax Cryptographic Relay
[TrueEntropy](https://github.com/vault12/TrueEntropy) | High volume thermal entropy generator

## License

Zax Dashboard is released under the [MIT License](http://opensource.org/licenses/MIT).

## Legal Reminder

Exporting/importing and/or use of strong cryptography software, providing cryptography hooks, or even just communicating technical details about cryptography software is illegal in some parts of the world. If you import this software to your country, re-distribute it from there or even just email technical suggestions or provide source patches to the authors or other people you are strongly advised to pay close attention to any laws or regulations which apply to you. The authors of this software are not liable for any violations you make - it is your responsibility to be aware of and comply with any laws or regulations which apply to you.
