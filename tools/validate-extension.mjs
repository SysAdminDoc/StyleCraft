import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  throw new Error(message);
};

const manifest = JSON.parse(read('manifest.json'));
const version = manifest.version;
const versionFiles = [
  ['package.json', `"version": "${version}"`],
  ['README.md', `version-${version}-blue`],
  ['CHANGELOG.md', `## [${version}]`],
  ['popup.html', `v${version}`],
  ['options.html', `v${version}`],
  ['popup.js', `version: '${version}'`],
  ['options.js', `version: '${version}'`],
  ['inject-styles.js', `StyleCraft v${version}`]
];

for (const [file, marker] of versionFiles) {
  if (!read(file).includes(marker)) fail(`${file} is missing version marker ${marker}`);
}

for (const [size, iconPath] of Object.entries(manifest.icons || {})) {
  if (!exists(iconPath)) fail(`manifest icon ${size} missing at ${iconPath}`);
}

for (const [size, iconPath] of Object.entries(manifest.action?.default_icon || {})) {
  if (!exists(iconPath)) fail(`action icon ${size} missing at ${iconPath}`);
}

const editorHtml = read('editor.html');
if (!editorHtml.includes('vendor/codemirror/stylecraft-codemirror.js')) {
  fail('editor.html does not load the bundled CodeMirror adapter');
}
if (/https?:\/\//i.test(editorHtml.match(/<script[\s\S]*?<\/script>/g)?.join('\n') || '')) {
  fail('editor.html contains a remote script reference');
}

const bundlePath = 'vendor/codemirror/stylecraft-codemirror.js';
if (!exists(bundlePath)) fail(`${bundlePath} missing; run npm run build:codemirror`);
const bundle = read(bundlePath);
if (!bundle.includes('StyleCraftCodeMirror')) fail('CodeMirror bundle missing StyleCraftCodeMirror export');

const roadmap = read('ROADMAP.md');
if (roadmap.includes('Move from hand-rolled tokenizer to CodeMirror 6 or Monaco')) {
  fail('Completed CodeMirror roadmap item is still present in ROADMAP.md');
}

const allowedMd = new Set([
  'README.md',
  'CLAUDE.md',
  'AGENTS.md',
  'CHANGELOG.md',
  'ROADMAP.md',
  'RESEARCH.md',
  'Roadmap_Blocked.md',
  'LICENSE',
  'PRIVACY.md'
]);

const packageSurface = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'], {
  cwd: root,
  encoding: 'utf8'
}).split(/\r?\n/).filter(Boolean);

for (const file of packageSurface) {
  if (!file.includes('/') && file.endsWith('.md') && !allowedMd.has(file)) {
    fail(`Disallowed root markdown file: ${file}`);
  }
}

console.log(`StyleCraft ${version} extension validation passed`);
