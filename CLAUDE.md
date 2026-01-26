# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server with HMR
npm run build    # TypeScript check + Vite production build
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

## Architecture

**TaskMaster** - A React task management SaaS application.

### Tech Stack
- React 19 + TypeScript + Vite 7
- Tailwind CSS v4 (uses `@theme` directive in CSS, no tailwind.config.js)
- lucide-react for icons
- shadcn/ui compatible (new-york style, see `components.json`)

### Path Aliases
`@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts)

### Styling System
Tailwind v4 configuration is in `src/index.css` using the `@theme` directive:
- Custom design tokens: `--color-primary`, `--color-background-light/dark`, etc.
- Font: Manrope (`--font-display`)
- Dark mode: `.dark` class variant with `@custom-variant dark`
- Uses `cn()` utility from `src/lib/utils.ts` for conditional class merging

### Component Organization
- `src/components/` - Feature components (Header, Hero, Pricing, Footer)
- `src/components/ui/` - shadcn/ui primitives (when added via `npx shadcn@latest add`)
- Export components through `src/components/index.ts` barrel file

### Adding shadcn/ui Components
```bash
npx shadcn@latest add button   # Add specific component
```
