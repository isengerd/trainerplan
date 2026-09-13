import { readFile, writeFile } from 'node:fs/promises';
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
if (!/^[A-Za-z0-9_-]+$/.test(buildId)) throw new Error('Invalid build ID');
const template = await readFile('scripts/platz-sw.template.js', 'utf8');
await writeFile('public/platz-sw.js', template.replace("nextsession-platz-v1", `nextsession-platz-${buildId}`));
console.log('Offline field worker generated for this build.');
