#!/usr/bin/env node

/**
 * Script to fix React imports for automatic JSX runtime
 * Removes unnecessary "import React" statements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src');

function fixReactImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  let changed = false;

  // Pattern 1: import React, { ... } from 'react'
  const pattern1 = /^import React,\s*({[^}]+})\s*from\s+['"]react['"];?\s*$/gm;
  if (pattern1.test(content)) {
    newContent = newContent.replace(pattern1, (match, namedImports) => {
      changed = true;
      return `import ${namedImports} from 'react';`;
    });
  }

  // Pattern 2: import React from "react" (standalone, no named imports)
  // Only remove if there are no React-specific features used (like React.Component)
  const pattern2 = /^import React\s+from\s+['"]react['"];?\s*$/gm;
  if (pattern2.test(newContent)) {
    // Check if file uses React.Component or other React-specific features
    const usesReactComponent = /React\.(Component|PureComponent|Fragment|createElement)/.test(newContent);
    if (!usesReactComponent) {
      newContent = newContent.replace(pattern2, '');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed: ${path.relative(srcDir, filePath)}`);
    return true;
  }
  return false;
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Main execution
const files = walkDir(srcDir);
let fixedCount = 0;

console.log('Fixing React imports for automatic JSX runtime...\n');

files.forEach(file => {
  if (fixReactImports(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} file(s).`);
console.log('You may need to restart your dev server for changes to take effect.');

