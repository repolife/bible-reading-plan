# PWA Icons

This directory contains the icons for the Progressive Web App.

## Current Icons
- icon-16x16.svg (16x16 pixels)
- icon-32x32.svg (32x32 pixels)
- icon-72x72.svg (72x72 pixels)
- icon-96x96.svg (96x96 pixels)
- icon-128x128.svg (128x128 pixels)
- icon-144x144.svg (144x144 pixels)
- icon-152x152.svg (152x152 pixels)
- icon-192x192.svg (192x192 pixels)
- icon-384x384.svg (384x384 pixels)
- icon-512x512.svg (512x512 pixels)

## To Replace with Custom Icons:

1. Create PNG versions of each icon size:
   - icon-16x16.png
   - icon-32x32.png
   - icon-72x72.png
   - icon-96x96.png
   - icon-128x128.png
   - icon-144x144.png
   - icon-152x152.png
   - icon-192x192.png
   - icon-384x384.png
   - icon-512x512.png

2. Use tools like:
   - **PWA Asset Generator**: https://github.com/elegantapp/pwa-asset-generator
   - **RealFaviconGenerator**: https://realfavicongenerator.net/
   - **PWA Builder**: https://www.pwabuilder.com/imageGenerator

3. Replace the SVG files with PNG files and update the manifest.json accordingly.

## Icon Requirements:
- **Maskable icons**: Should have important content in the center 80% of the image
- **Any icons**: Can use the full canvas
- **Formats**: PNG recommended for better browser support
- **Background**: Should work on any background color

## Design Guidelines:
- Use your app's brand colors
- Keep the design simple and recognizable at small sizes
- Ensure good contrast for visibility
- Consider how the icon looks when rounded (iOS) or masked (Android)
