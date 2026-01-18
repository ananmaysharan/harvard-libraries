# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Harvard Libraries is an interactive 3D web mapping application built with React 19, Vite, Mapbox GL, and Deck.gl for geospatial visualization.

## Development Commands

```bash
npm run dev       # Start development server (http://localhost:5173)
npm run build     # Production build to dist/
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Environment Setup

Requires a Mapbox token in `.env`:
```
VITE_MAPBOX_TOKEN=your_token_here
```

Access via `import.meta.env.VITE_MAPBOX_TOKEN` in code.

## Architecture

**Entry Point:** `src/main.jsx` → `src/App.jsx`

**Core Technologies:**
- **Mapbox GL** - Base map rendering with 3D terrain and buildings
- **Deck.gl** - High-performance geospatial visualization layers
- **@loaders.gl** - Tile and I3S format loaders for 3D data
- **proj4/@math.gl/proj4** - Coordinate projection transformations

**Component Structure:**
- `App.jsx` - Main map component using direct Mapbox GL (not react-map-gl wrapper)
- `components/Sidebar.jsx` - Header and real-time clock display

**Map Configuration:**
- Location: Harvard Libraries (42.37432°N, -71.11647°W)
- 3D view with 60° pitch, 135° bearing, zoom 16.8
- Mapbox Standard style with "dusk" light preset

**Data Assets:**
- `public/libraries.csv` - Library location data
- `public/model-fixed.glb` - 3D model asset

## Code Patterns

- Uses React hooks (useState, useEffect, useRef) for state and map lifecycle
- Map initialized via ref pattern with cleanup in useEffect
- ESLint configured with flat config format; uppercase/underscore variables allowed unused
