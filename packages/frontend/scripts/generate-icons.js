#!/usr/bin/env node

// Simple script to generate placeholder PWA icons
// You can replace this with proper icon generation using tools like sharp or canvas

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512]
const iconsDir = path.join(__dirname, '../public/icons')

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Generate SVG icon template
function generateSVGIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad1)" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">📖</text>
</svg>`
}

// Generate placeholder icons
console.log('Generating placeholder PWA icons...')

iconSizes.forEach(size => {
  const svgContent = generateSVGIcon(size)
  const filename = `icon-${size}x${size}.svg`
  const filepath = path.join(iconsDir, filename)
  
  fs.writeFileSync(filepath, svgContent)
  console.log(`Generated: ${filename}`)
})

// Create a README file with instructions
const readmeContent = `# PWA Icons

This directory contains the icons for the Progressive Web App.

## Current Icons
${iconSizes.map(size => `- icon-${size}x${size}.svg (${size}x${size} pixels)`).join('\n')}

## To Replace with Custom Icons:

1. Create PNG versions of each icon size:
   ${iconSizes.map(size => `- icon-${size}x${size}.png`).join('\n   ')}

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
`

fs.writeFileSync(path.join(iconsDir, 'README.md'), readmeContent)

console.log('✅ Placeholder icons generated successfully!')
console.log('📝 Check public/icons/README.md for instructions on creating custom icons')
console.log('🎨 Replace the SVG files with PNG files for production use') 