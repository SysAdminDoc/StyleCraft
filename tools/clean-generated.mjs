import fs from 'node:fs';

for (const file of process.argv.slice(2)) {
  const text = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, text.replace(/[ \t]+$/gm, ''));
}
