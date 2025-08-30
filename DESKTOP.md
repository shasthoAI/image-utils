Image Utils Desktop (Electron)

Prereqs
- Node.js 18+ (LTS recommended). Older Node will fail installing Electron.
- macOS: Xcode CLT. Windows: Build Tools for VS 2019+. Linux: build-essential, libX11-dev, etc.
- Poppler installed and in PATH if using PDF → image (node-poppler depends on it).

Install
1. npm install
2. Build the new React UI: npm run app:build (dev: npm run app:dev)
3. If native deps need rebuild: npx electron-builder install-app-deps

Run (dev)
- UI + API (browser): npm run dev
  - runs API at :3000 with auto-restart (nodemon)
  - runs UI at :5173 with Vite HMR and proxies /api,/uploads,/outputs
- Desktop with live UI: npm run dev:desktop
  - starts API + Vite
  - launches Electron pointed at UI_DEV_URL (Vite), while API stays on :3000

Build Installers
- macOS/Win/Linux: npm run desktop:dist (builds UI then packages Electron)
- Windows: npm run desktop:dist (creates .exe/.msi depending on target)
- Linux: npm run desktop:dist (AppImage/deb/rpm in dist/)

Notes
- The Electron app starts the internal Express server on an available port and loads the existing web UI.
- Output/Uploads/Data directories are the same as the CLI/web server version: `uploads/`, `outputs/`, and `data/`.
- Sharp, sqlite3, and node-poppler are native modules. electron-builder will rebuild them; ensure compilers are available.

Troubleshooting
- If `npm install` fails with syntax errors in Electron’s installer, upgrade Node to 18+.
- If packaging fails on sharp/sqlite3: run `npx electron-builder install-app-deps` or `npx electron-rebuild`.
- For PDF conversion, install Poppler and ensure `pdftocairo` is on PATH.
