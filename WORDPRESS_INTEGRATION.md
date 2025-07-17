# WordPress Integration Guide

## For Non-Technical WordPress Users

This guide shows you how to add the multi-pass air filtration simulation to your WordPress site in just a few minutes.

## Method 1: Simple iframe (Recommended)

### Step 1: Get Your Simulation URL
After setting up GitHub Pages, you'll have a URL like:
`https://YOUR_ORGANIZATION.github.io/multipass-simulation/`

### Step 2: Add to WordPress
1. Edit any WordPress post or page
2. Switch to "Text" or "Code" editor mode
3. Paste this code where you want the simulation:

```html
<iframe 
  src="https://YOUR_ORGANIZATION.github.io/multipass-simulation/" 
  width="100%" 
  height="600px" 
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
</iframe>
```

4. Replace `YOUR_ORGANIZATION` with your actual GitHub organization name
5. Save/publish the page

**That's it!** The simulation will appear on your page.

## Method 2: WordPress Shortcode (More Flexible)

### Step 1: Add Function to Your Theme
1. In WordPress admin, go to Appearance → Theme Editor
2. Select `functions.php` from the file list
3. Add this code at the bottom (before the closing `?>` if it exists):

```php
function multipass_simulation_shortcode($atts) {
    $atts = shortcode_atts(array(
        'width' => '100%',
        'height' => '600px',
        'url' => 'https://YOUR_ORGANIZATION.github.io/multipass-simulation/'
    ), $atts);
    
    return '<iframe src="' . esc_url($atts['url']) . '" width="' . esc_attr($atts['width']) . '" height="' . esc_attr($atts['height']) . '" frameborder="0" style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></iframe>';
}
add_shortcode('multipass', 'multipass_simulation_shortcode');
```

4. Replace `YOUR_ORGANIZATION` with your actual GitHub organization name
5. Click "Update File"

### Step 2: Use the Shortcode
Now you can add the simulation to any post or page by typing:
`[multipass]`

Or customize the size:
`[multipass width="800px" height="500px"]`

## Method 3: WordPress Plugin (Advanced)

If you want more control, you can create a simple plugin:

### Step 1: Create Plugin File
1. Create a new file called `multipass-simulation.php`
2. Add this code:

```php
<?php
/*
Plugin Name: Multi-Pass Air Filtration Simulation
Description: Embeds multi-pass air filtration simulations
Version: 1.0
*/

function multipass_simulation_shortcode($atts) {
    $atts = shortcode_atts(array(
        'width' => '100%',
        'height' => '600px'
    ), $atts);
    
    $url = 'https://YOUR_ORGANIZATION.github.io/multipass-simulation/';
    
    return '<div style="position: relative; width: ' . esc_attr($atts['width']) . '; height: ' . esc_attr($atts['height']) . ';">
        <iframe src="' . esc_url($url) . '" width="100%" height="100%" frameborder="0" style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></iframe>
    </div>';
}
add_shortcode('multipass', 'multipass_simulation_shortcode');
?>
```

### Step 2: Install Plugin
1. Upload the file to `/wp-content/plugins/` directory
2. Activate the plugin in WordPress admin
3. Use `[multipass]` shortcode in posts/pages

## Troubleshooting

### Simulation Not Loading
- Check that the GitHub Pages URL is correct
- Ensure the repository is public
- Wait a few minutes after deployment for DNS propagation

### Size Issues
- Adjust `width` and `height` attributes in the iframe
- Use responsive units like `100%` for width
- Minimum recommended height is `500px`

### Theme Conflicts
- If iframe appears broken, try adding this CSS to your theme:
```css
iframe[src*="github.io"] {
    max-width: 100% !important;
    border: none !important;
}
```

## Styling Options

You can customize the appearance by modifying the iframe's `style` attribute:

```html
<iframe 
  src="https://YOUR_ORGANIZATION.github.io/multipass-simulation/" 
  width="100%" 
  height="600px" 
  frameborder="0"
  style="
    border: 2px solid #007cba;
    border-radius: 12px;
    box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    background: #f9f9f9;
  ">
</iframe>
```

## Performance Notes

- The simulation loads ~45MB of CFD data progressively
- First load may take 10-15 seconds on slower connections
- Subsequent loads are much faster due to browser caching
- Mobile devices are fully supported

## Updates

When you push changes to the GitHub repository, the simulation will automatically update within a few minutes. No changes needed on the WordPress side.