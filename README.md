# Liminal-Zero: Infinite Backrooms

Liminal-Zero is a high-fidelity, browser-based psychological horror exploration experience powered by Three.js and React. It simulates the 'Backrooms' phenomenon—an infinite, procedurally generated maze of mono-yellow rooms, humming fluorescent lights, and non-Euclidean geometry. The application leverages WebGL for 3D rendering and a Retro/VHS aesthetic for the User Interface.

This project is built as a Cloudflare Workers application, serving a single-page app with optional API routes for extensibility.

[cloudflarebutton]

## Features

- **Infinite Procedural Generation**: Deterministic seeding ensures consistent, infinite maze layouts using coordinate-based chunking.
- **Immersive 3D Engine**: First-person controls with pointer lock, collision detection (AABB), and dynamic room loading/unloading for performance.
- **Retro VHS Aesthetic**: Diegetic UI with camcorder HUD (REC overlay, battery, timestamps) and CRT-styled pause menus.
- **Visual Effects**: Custom VHS post-processing, fog, ambient lighting, and subtle distortions for horror atmosphere.
- **Responsive Controls**: WASD movement, mouse look, Shift to run, ESC for pause—optimized for desktop browsers.
- **Performance Optimizations**: Occlusion culling, limited pixel ratio, and memory management to prevent leaks in procedural worlds.
- **Modular Architecture**: React for UI, Three.js for rendering, with Hono for any backend API needs.

## Tech Stack

- **Frontend**: React, Three.js, Framer Motion (animations), Lucide React (icons), Tailwind CSS (styling), Shadcn/UI (components), Clsx & Tailwind Merge (class utilities).
- **Primitives**: Radix UI (Dialog, Slider, Slot).
- **Backend/Deployment**: Cloudflare Workers, Hono (routing), TypeScript, Wrangler (CLI).
- **Build Tools**: Bun (package manager), ESLint (linting).

## Quick Start

To get started quickly, clone the repository and follow the installation steps below. For instant deployment, use the Cloudflare button above.

## Installation

This project uses Bun as the package manager. Ensure you have Bun installed (v1.0+ recommended).

1. Clone the repository:
   ```
   git clone <repository-url>
   cd liminal-zero
   ```

2. Install dependencies:
   ```
   bun install
   ```

3. The project is now ready for development. No additional build steps are required for local serving.

## Usage

The application serves as a single-page app from `/public/`. Key entry points:

- **Main Viewport**: Load `index.html` in a browser to enter the 3D Backrooms world. Click to initialize pointer lock and begin exploration.
- **API Routes**: Optional endpoints under `/api/*` (e.g., `/api/health` for status checks). Extend in `worker/index.ts` for custom logic like saving player progress.
- **Controls**:
  - **Movement**: WASD keys (walk), hold Shift to run.
  - **Look**: Mouse movement (after pointer lock engages).
  - **Pause**: ESC key to unlock pointer and show the retro menu.
- **HUD Elements**: Real-time updates for battery, timestamps, and sanity metrics appear in the camcorder overlay.

Example API call (from browser console or `app.js`):
```javascript
fetch('/api/health')
  .then(res => res.json())
  .then(data => console.log(data));
```

## Development

1. Start the local development server:
   ```
   bun run dev
   ```
   This uses Wrangler to serve the app at `http://localhost:8787`. Hot reloading is supported for static assets; restart for Worker changes.

2. Make changes:
   - Edit frontend files in `/public/` (HTML, CSS, JS/TSX).
   - For React integration, ensure components are bundled or served via Worker if needed (current setup is vanilla JS; extend with React via CDN or bundler if expanding).
   - Add API routes in `worker/index.ts` using Hono.
   - Lint the code:
     ```
     bun run lint
     ```

3. Test in browser: Open `http://localhost:8787` and interact with the 3D canvas. Monitor console for Three.js logs or errors.

For debugging:
- Use browser dev tools for frontend.
- Cloudflare's Wrangler logs Worker requests/errors.
- Avoid WebGL issues by testing on desktop Chrome/Firefox.

## Deployment

Deploy to Cloudflare Workers for global edge distribution. No build step needed—assets are served directly.

1. Ensure Wrangler is authenticated:
   ```
   wrangler login
   ```

2. Deploy:
   ```
   bun run deploy
   ```
   This publishes to your Cloudflare account under the project name `liminal-zero`.

3. Access the deployed app at `<your-worker-name>.workers.dev`. Static assets (e.g., Three.js CDN) load globally.

For custom domains or environment variables, edit `wrangler.jsonc` and run `wrangler deploy --env production`.

[cloudflarebutton]

## Contributing

Contributions are welcome! Please:
- Fork the repo and create a feature branch.
- Ensure code passes linting and works in modern browsers.
- Focus on performance (e.g., dispose Three.js geometries) and accessibility (e.g., keyboard navigation).
- Submit pull requests with clear descriptions.

## License

This project is licensed under the MIT License. See the LICENSE file for details (if not present, add one). 

For issues or questions, open a GitHub issue.