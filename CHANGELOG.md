# Changelog

All notable changes to the TWIN Vietnam Demo will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Task management system in `.claude/tasks.md` (87 tasks across 4 phases)
- Project CLAUDE.md with task workflow, gitflow, and coding conventions
- `develop` branch for feature integration

## [1.0.0] - 2026-05-15

Initial demo release.

### Added
- Two-node architecture (Alpha: Vietnam Export, Beta: US/EU Import)
- 14 organizations across both nodes
- 11 consignment records with full document sets
- DID registration with credential validation
- Document upload with simulated notarization
- Permission-based consignment sharing with P2P propagation
- Cascade revoke across nodes
- Trade finance: Letters of Credit with 6-step stepper, Smart Contracts
- Payment tracking with status updates
- Network map with geographic visualization
- Tangle Explorer with immutable event log
- WebSocket P2P peering with reconnection handling
- Cookie-based proxy for single-URL access (port 4002)
- Docker Compose deployment with Traefik
- Responsive text truncation for narrow viewports
