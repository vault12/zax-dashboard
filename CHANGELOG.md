# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.0.21] - 2026-10-09

### Changed

- Updated glow.ts to 1.3.2. Received file metadata is no longer typed by glow, so the dashboard
  checks for the `name`, `orig_size` and `skey` fields it sends before showing or downloading a file.
- Updated Angular to 22.2.2, which fixes the npm audit findings in `@angular/router`
  (GHSA-ff3f-86qr-9cv3) and `piscina` via `@angular/build` (GHSA-67c8-pqhq-4rmx).

## [1.0.20] - 2026-09-23

### Changed

- Updated glow.ts to 1.3.0, which reports messages that fail authentication as a new `unverified` kind.
- Updated Angular to 22.1 and zone.js to 0.16, and removed the unused `@angular/animations`
  and `@angular/platform-browser-dynamic` packages.
- Fixed npm audit issues.

## [1.0.19] - 2026-06-26

### Changed

- Upgraded to Angular 22. The dashboard component keeps the classic check-always change detection,
  since Angular 22 makes OnPush the default.
- Migrated ESLint to version 10 with a flat config (`eslint.config.js`), using the `angular-eslint`
  and `typescript-eslint` packages, and updated TypeScript to 6.
- Fixed npm audit issues.

## [1.0.18] - 2026-03-31

### Changed

- Fixed npm audit issues.

## [1.0.17] - 2026-02-27

### Changed

- Fixed npm audit issues.

## [1.0.16] - 2026-02-16

### Changed

- Fixed npm audit issues.

## [1.0.15] - 2026-01-12

### Changed

- Fixed npm audit issues.

## [1.0.14] - 2025-12-01

### Changed

- Upgraded to Angular 21.
- Fixed npm audit issues.

## [1.0.13] - 2025-09-19

### Changed

- Fixed npm audit issues.

## [1.0.12] - 2025-08-28

### Changed

- Fixed npm audit issues.

## [1.0.11] - 2025-02-13

### Changed

- Fixed npm audit issues.

## [1.0.10] - 2024-09-23

### Changed

- Fixed npm audit issues.

## [1.0.9] - 2024-09-02

### Changed

- Upgraded to Angular 18.
- Fixed npm audit issues.

## [1.0.8] - 2024-09-02

### Changed

- Fixed npm audit issues.

## [1.0.7] - 2024-05-02

### Changed

- Fixed npm audit issues.

## [1.0.6] - 2024-02-15

### Changed

- Updated favicon.
- Added a separate build script for Github Pages environment.

## [1.0.5] - 2024-02-07

### Changed

- Updated Github Actions CI job.
- Redirected all routes to the default one.
- Updated Angular and dependencies versions.
- Made the package public.

### Fixed

- Added support for 127.0.0.1 as a host name to run against a test relay.

## [1.0.4] - 2023-07-21

### Changed

- Upgraded to Angular 16.
- Fixed npm audit issues.

## [1.0.3] - 2022-02-15

### Changed

- Upgraded to Angular 13.
- Updated Node version on CI.

## [1.0.2] - 2017-11-29

### Changed

- Allowed downloading files consisting of multiple chunks.
- Updated test relay address.
- Inverted message details button in expanded state.
- Updated GitHub badges.

## [1.0.1] - 2021-07-04

### Added

- Added mailbox and message form validations.
- Added support for file upload/download.

### Changed

- Migrated to [Glow.ts](https://github.com/vault12/glow.ts) from the original [Glow](https://github.com/vault12/glow).
- Optimized bulk message delete.
- Added ESLint rules.

### Fixed

- Deleted files before deleting file messages.

## [1.0.0] - 2019-07-15

- Initial release, replacing the discontinued [Zax-Dash](https://github.com/vault12/zax-dash) repository, powered by AngularJS.

