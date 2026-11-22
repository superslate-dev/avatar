# @superslate/avatar — Avatar Studio

> Open-source soft gradient SVG avatar generator by Superslate. 6 shape families, 40 palettes, light and dark appearances, OKLCH tone controls, deterministic variants, and zero runtime dependencies.

## Features

- 6 shape families: Bloom, Silk, Flare, Nova, Void, Jade
- 40 curated 9-token color palettes
- Dedicated light and dark appearances with OKLCH palette derivation
- Global OKLCH tone controls (`hue`, relative `chroma`, `lightness`)
- Deterministic geometry drift via `variantId` and `drift`
- Optional grapheme-safe initials overlay (up to 2 clusters)
- Pure 64×64 SVG output with zero runtime dependencies, plus React component and CLI
- Interactive SVG, PNG, and JPG export in the browser

## Install

```bash
npm install @superslate/avatar
```

## Core Usage

```ts
import {createAvatar} from '@superslate/avatar'

const {svg} = createAvatar({
  shape: 'bloom',
  palette: 'rose-milk',
  tone: {hue: 320, chroma: 0.9, lightness: 0},
  appearance: 'dark',
  variantId: 'a1f3',
  drift: 8,
  size: 64,
})
```

## React

```tsx
import {Avatar} from '@superslate/avatar/react'

<Avatar
  shape="bloom"
  palette="rose-milk"
  variantId="a1f3"
  drift={8}
  size={64}
/>
```

## Links

- [Avatar Studio](https://superslate.dev/avatars/)
- [Source on GitHub](https://github.com/superslate-dev/avatar)
- [npm package](https://www.npmjs.com/package/@superslate/avatar)
- [Superslate](https://superslate.dev/?ref=avatars) — TypeScript SaaS boilerplate for coding agents (React + Hono, TanStack Start, Expo)
- [Live Superslate demo](https://app.superslate.dev/?utm_source=avatars&utm_medium=oss)
