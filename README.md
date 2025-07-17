# Multi-Pass Air Filtration Simulation

A standalone deployment package for embedding multi-pass air filtration simulations into WordPress sites.

## What This Is

This is a clean, self-contained web application that shows how different air filters perform in recirculating room air over time. It features:

- **Clean interface**: Only shows the global clock and filter simulations (no headers or navigation)
- **7 Filter Types**: HEPA, MERV15, MERV13, MERV10, ViSTAT-10, MERV7, ViSTAT-7
- **Real-time simulation**: Particles bouncing around a room and being gradually filtered
- **Synchronized timing**: All filters run on the same accelerated timeline
- **Performance comparison**: Shows how ViSTAT filters compete with traditional MERV filters

## Quick WordPress Integration

```html
<iframe 
  src="https://jimmymcnider.github.io/multipassairflow/" 
  width="100%" 
  height="600px" 
  frameborder="0"
  style="border: none; border-radius: 8px;">
</iframe>
```

## Features

- **Mobile responsive** - Works on all devices
- **High performance** - Optimized with Web Workers
- **Self-contained** - No external dependencies or API calls
- **Automatic updates** - Deploys automatically when code changes

## Technical Details

- Built with React and Vite
- Uses Canvas2D for particle rendering
- Real CFD data from OpenFOAM simulations
- Web Worker optimization for 60+ FPS performance
- Total size: ~45MB (mostly CFD data, loads progressively)
