# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is an Electron desktop application built with **electron-vite**, **React 18**, **TypeScript**, and **Tailwind CSS v4**. It uses a standard Electron three-process layout: main, preload, and renderer. The renderer is a React SPA with client-side routing via `react-router-dom` v7.

The app currently uses a hidden system title bar (`titleBarStyle: 'hidden'`) with a custom drag region defined in CSS, and has a light/dark theme toggle that persists to `localStorage`.

## Common commands

Use `npm` (or `yarn`; a `yarn.lock` is present). The `.npmrc` points Electron downloads to the npmmirror China mirror.

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start development with HMR | `npm run dev` |
| Type-check main + preload | `npm run typecheck:node` |
| Type-check renderer | `npm run typecheck:web` |
| Type-check everything | `npm run typecheck` |
| Lint | `npm run lint` |
| Format with Prettier | `npm run format` |
| Build renderer + main + preload | `npm run build` |
| Preview the production build | `npm run start` |
| Package for current platform | `npm run build:win` / `build:mac` / `build:linux` |
| Package unpacked | `npm run build:unpack` |

There are no test scripts or test framework configured in this repository.

## Code architecture

### Process layout

The repository follows electron-vite's conventional three-entry structure:

- `src/main/index.ts` — Main process. Creates the `BrowserWindow`, loads the renderer (dev URL or local HTML), registers IPC handlers, and sets up window-shortcut optimization via `@electron-toolkit/utils`.
- `src/preload/index.ts` — Preload script. Exposes `window.electron` (from `@electron-toolkit/preload`) and a placeholder `window.api` object through `contextBridge`.
- `src/renderer/src/` — Renderer process. A React 18 SPA rendered into `index.html`.

### Renderer structure

- `src/renderer/src/main.tsx` — Entry point. Mounts the app inside `React.StrictMode` and delegates routing to `RouterProvider`.
- `src/renderer/src/router/RouterProvider.tsx` — Wraps `react-router-dom` with `Suspense` and a `<Loading />` fallback. It converts the custom `AppRouteObject` tree to plain `RouteObject` instances and creates a browser router.
- `src/renderer/src/router/routes.tsx` — Route definitions. Routes are declared as `AppRouteObject`, an extension of `RouteObject` that adds an optional `meta` field for `title`, `requiresAuth`, and `permissions`. Page components are lazy-loaded.
- `src/renderer/src/router/RouteGuard.tsx` and `src/renderer/src/hooks/useRouteGuard.ts` — Scaffolding for auth/permission guards. They are **not currently wired into `RouterProvider`**; the auth/permission checks return hard-coded `true` and must be replaced with real logic.
- `src/renderer/src/layouts/MainLayout.tsx` — Root layout. Contains a draggable header region (`drag-region`) and a non-draggable toggle button (`no-drag`) for the theme switch. Renders nested routes via `<Outlet />`.
- `src/renderer/src/components/ThemeToggle.tsx` — Toggles `dark`/`light` classes on `document.documentElement` and persists the choice to `localStorage`.
- `src/renderer/src/styles/index.css` — Tailwind v4 entry (`@import "tailwindcss"`), custom `dark`/`light` variants, and drag-region utilities.

### Build and tooling

- `electron.vite.config.ts` configures three separate Vite builds (`main`, `preload`, `renderer`). The renderer uses `@vitejs/plugin-react` and `@tailwindcss/vite` and defines a path alias `@renderer` → `src/renderer/src`.
- `tsconfig.json` is a project-references root; `tsconfig.node.json` covers main/preload/config, and `tsconfig.web.json` covers the renderer.
- `eslint.config.mjs` extends `@electron-toolkit/eslint-config-ts` and adds React, React Hooks, React Refresh, and Prettier rules.
- `.prettierrc.yaml` enforces single quotes, no semicolons, 100-character print width, and no trailing commas.
- `electron-builder.yml` packages the app with `appId: com.electron.app` and a generic auto-update provider pointing at `https://example.com/auto-updates`. macOS entitlements are read from `build/entitlements.mac.plist`.

### Important implementation details

- The main window has `sandbox: false` and loads `src/preload/index.js` from a relative path inside `__dirname`.
- The hidden title bar relies on the `-webkit-app-region: drag` / `no-drag` CSS classes; any interactive element in the header must use `no-drag` or it will not receive pointer events.
- Tailwind CSS v4 is configured via `postcss.config.js` (`@tailwindcss/postcss`) and the Vite plugin, not a `tailwind.config.ts` file.
- `window.electron.process.versions` is used in `Versions.tsx` to display Electron/Chromium/Node versions.
