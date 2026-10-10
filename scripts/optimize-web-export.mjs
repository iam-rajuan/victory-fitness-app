import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'dist', 'index.html');
let html = fs.readFileSync(file, 'utf8');
const emptyRoot = '<div id="root"></div>';
if (!html.includes(emptyRoot)) throw new Error('Unexpected Expo HTML: missing empty root. Update the startup shell integration.');
// React replaces this shell when it mounts. No scripts, fonts or images are
// required to paint the first screen while the app bundle downloads.
html = html.replace(emptyRoot, `<div id="root"><div role="status" aria-live="polite" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0D0D0D;color:#F7F3EE;font:16px system-ui,sans-serif"><span style="color:#C9943A;font-weight:700;letter-spacing:.15em">VICTORY FITNESS</span><span>Loading your app…</span></div></div>`);
html = html.replace('</head>', '<meta name="theme-color" content="#0D0D0D"><style>html,body{background:#0D0D0D}</style></head>');
fs.writeFileSync(file, html);
console.log('Added the dependency-free web startup shell.');
