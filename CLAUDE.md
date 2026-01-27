# Claude Code Rules for IQM Quantum Explorer

## Package Manager
- This project uses **bun** as the package manager, not npm
- Use `bun install` instead of `npm install`
- Use `bun run build` instead of `npm run build`
- Use `bun run dev` instead of `npm run dev`
- **Never commit package-lock.json** - the project uses `bun.lock` instead

## Build & Development
- Build command: `bun run build`
- Dev server: `bun run dev`
- Preview: `bun run preview`

## Project Stack
- React 19 with TypeScript
- Vite for bundling
- Three.js + React Three Fiber for 3D visualization
- Tailwind CSS for styling
- Framer Motion for animations
