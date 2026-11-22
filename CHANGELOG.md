# Changelog

All notable changes to `@superslate/avatar` are documented here.

## [0.1.1] - 2026-11-22

- Remove `registry-url` from `actions/setup-node` in `release.yml` so npm OIDC trusted publishing runs without a placeholder `NODE_AUTH_TOKEN` entry and publishes with cryptographic provenance attestation.

## [0.1.0] - 2026-11-22

- Initial public open-source release with 6 shape families (Prism, Veil, Ember, Zenith, Beam, Horizon), 40 curated palettes, OKLCH tone controls, dedicated light/dark appearance grammar, grapheme-safe initials overlay, React component (`@superslate/avatar/react`), CLI (`superslate-avatar`), and live Avatar Studio (`https://superslate.dev/avatars/`).
