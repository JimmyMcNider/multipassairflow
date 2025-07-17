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

Once deployed to GitHub Pages, embed with this simple iframe code:

```html
<iframe 
  src="https://YOUR_GITHUB_ORG.github.io/multipass-simulation/" 
  width="100%" 
  height="600px" 
  frameborder="0"
  style="border: none; border-radius: 8px;">
</iframe>
```

Or create a WordPress shortcode by adding this to your theme's `functions.php`:

```php
function multipass_simulation_shortcode() {
    return '<iframe src="https://YOUR_GITHUB_ORG.github.io/multipass-simulation/" width="100%" height="600px" frameborder="0" style="border: none; border-radius: 8px;"></iframe>';
}
add_shortcode('multipass', 'multipass_simulation_shortcode');
```

Then use `[multipass]` in any WordPress post or page.

## GitHub Pages Deployment

### Step 1: Create Repository
1. Create a new repository on GitHub
2. Upload all files from this `multipass-deploy` folder
3. Push to the `main` branch

### Step 2: Enable GitHub Pages
1. Go to your repository Settings
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Choose "gh-pages" as the branch
5. GitHub Actions will automatically deploy when you push changes

### Step 3: Get Your URL
After deployment, your simulation will be available at:
`https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPO_NAME/`

## Repository Transfer

To transfer control to your organization:

1. Go to repository Settings
2. Scroll to "Danger Zone" at the bottom
3. Click "Transfer ownership"
4. Enter the new owner's GitHub username/organization
5. They'll receive an email to accept the transfer

## File Structure

- `index.html` - Main entry point
- `assets/` - JavaScript and CSS bundles
- `cfd-data/` - CFD simulation data for all filter types
- `particle-worker.js` - Web worker for particle simulation performance
- `.github/workflows/deploy.yml` - Automated deployment configuration

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

## Support

This is a standalone deployment package. For technical support or updates, contact the original developer before the handoff period ends.