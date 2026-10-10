import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'dist', 'index.html');
let html = fs.readFileSync(file, 'utf8');
const emptyRoot = '<div id="root"></div>';
if (!html.includes(emptyRoot)) throw new Error('Unexpected Expo HTML: missing empty root. Update the startup shell integration.');
// React replaces this shell when it mounts. It uses only inline CSS so it
// appears immediately without competing with the application bundle.
html = html.replace(emptyRoot, `<div id="root"><div role="status" aria-live="polite" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,#173955 0,#0D0D0D 52%);color:#F7F3EE;font:16px system-ui,sans-serif"><div style="display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center"><div style="width:56px;height:56px;border:2px solid rgba(201,148,58,.28);border-top-color:#C9943A;border-radius:50%;box-sizing:border-box;animation:vf-spin .9s linear infinite"></div><div style="font-size:12px;font-weight:800;letter-spacing:.2em;color:#C9943A">VICTORY FITNESS</div><div style="font-size:15px;color:rgba(247,243,238,.72)">Preparing your training space</div></div></div></div>`);
const ioniconsDirectory = path.join(root, 'dist', 'assets', 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'Fonts');
const ioniconsFile = fs.existsSync(ioniconsDirectory)
  ? fs.readdirSync(ioniconsDirectory).find((name) => name.startsWith('Ionicons.') && name.endsWith('.ttf'))
  : undefined;
const ioniconsPreload = ioniconsFile ? `<link rel="preload" href="/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/${ioniconsFile}" as="font" type="font/ttf" crossorigin>` : '';
html = html.replace('</head>', `${ioniconsPreload}<meta name="theme-color" content="#0D0D0D"><style>html,body{background:#0D0D0D}@keyframes vf-spin{to{transform:rotate(360deg)}}</style></head>`);
fs.writeFileSync(file, html);
console.log('Added the dependency-free web startup shell.');
