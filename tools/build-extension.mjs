import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const out = path.join(dist, `stylecraft-v${manifest.version}.zip`);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const include = [
  'manifest.json',
  'background.js',
  'content.js',
  'editor.html',
  'editor.js',
  'icon.png',
  'inject-styles.js',
  'LICENSE',
  'options.html',
  'options.js',
  'popup.html',
  'popup.js',
  'PRIVACY.md',
  'README.md',
  'style-data.js',
  'style-match.js',
  'usw-adapter.js',
  'theme.js',
  'vendor/codemirror/stylecraft-codemirror.js',
  'vendor/sass/stylecraft-sass.js',
  'vendor/postcss/stylecraft-postcss.js'
];

for (const file of include) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing build input: ${file}`);
}

execFileSync('C:\\Windows\\System32\\tar.exe', ['-a', '-c', '-f', out, ...include], {
  cwd: root,
  stdio: 'inherit'
});

console.log(out);
