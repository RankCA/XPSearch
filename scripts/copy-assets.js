#!/usr/bin/env node
/**
 * Copies Bootstrap CSS/JS and Bootstrap Icons from node_modules to public/
 * so the app can serve them locally without relying on a CDN.
 *
 * Run with: npm run build
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`  ✓ ${path.relative(root, dest)}`);
}

function cpDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) cpDir(s, d);
    else cp(s, d);
  }
}

console.log('Copying Bootstrap assets to public/...');

// Bootstrap CSS + JS
cp(
  path.join(root, 'node_modules/bootstrap/dist/css/bootstrap.min.css'),
  path.join(root, 'public/css/bootstrap.min.css')
);
cp(
  path.join(root, 'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js'),
  path.join(root, 'public/js/bootstrap.bundle.min.js')
);

// Bootstrap Icons CSS + fonts
cp(
  path.join(root, 'node_modules/bootstrap-icons/font/bootstrap-icons.min.css'),
  path.join(root, 'public/css/bootstrap-icons.min.css')
);
cpDir(
  path.join(root, 'node_modules/bootstrap-icons/font/fonts'),
  path.join(root, 'public/css/fonts')
);

console.log('Done.');
