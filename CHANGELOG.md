# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-15

### Added
- Implemented data cleaning pipeline using Python (https://github.com/vkumar825/arxiv-search/pull/28)
- Refactored codebase to move away from schema-blind approach and stick to arXiv dataset
- Overhauled arXiv schema to account for the cleaned arXiv dataset (https://github.com/vkumar825/arxiv-search/pull/27)
- Fixed error handling typos in `ingestion-service.ts` to properly catch errors that went undetected
- Added unit tests for search controllers, milvus schemas, and embedding services.

### Changed
- Updated dependencies, removed unused libraries in package.json
- Addressed security vulnerabilities for `adm-zip`, `sharp`, and `qs` packages

## [0.2.2] - 2026-08-29

### Added
- Integrated Vitest testing framework (https://github.com/vkumar825/arxiv-search/issues/15)
- Added unit tests for search controllers, milvus schemas, and embedding services.

## [0.2.1] - 2026-08-02

### Changed
- Updated dependencies to address security vulnerabilities (https://github.com/vkumar825/arxiv-search/pull/24)

## [0.2.0] - 2026-07-31

### Changed
- Migrated to `typescript` (https://github.com/vkumar825/arxiv-search/pull/22)
- Changed `README.md` to reflect the latest changes
- Included a step to use the Express.js Search API in the `README.md`

## Added
- Set up basic configuration for TypeScript

## [0.1.0] - 2026-07-19

### Added
- Initial project scaffolding and basic setup.
- Basic functionalities of the Milvus vector database implemented in the first release.
- Included detailed documentation and setup instructions in the `README.md`
