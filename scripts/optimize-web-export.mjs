import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'dist', 'index.html');
let html = fs.readFileSync(file, 'utf8');
// Metro's entry name can remain unchanged when its async route map changes.
// Hash the final bytes so immutable browser caches cannot retain an old map.
html = html.replace(/src="(\/_expo\/static\/js\/web\/entry-[^"/]+\.js)"/g, (tag, url) => {
  const entryPath = path.join(root, 'dist', url);
  const hash = createHash('sha256').update(fs.readFileSync(entryPath)).digest('hex').slice(0, 32);
  const nextUrl = url.replace(/entry-[^/]+\.js$/, `entry-${hash}.js`);
  fs.copyFileSync(entryPath, path.join(root, 'dist', nextUrl));
  return `src="${nextUrl}"`;
});
const emptyRoot = '<div id="root"></div>';
if (!html.includes(emptyRoot)) throw new Error('Unexpected Expo HTML: missing empty root. Update the startup shell integration.');
// React replaces this shell when it mounts. It uses only inline CSS so it
// appears immediately without competing with the application bundle.
html = html.replace(emptyRoot, `<div id="root"><div role="status" aria-live="polite" style="position:fixed;inset:0;width:100vw;height:100vh;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,#173955 0,#0D0D0D 52%);color:#F7F3EE;font:16px system-ui,sans-serif"><div style="display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center"><div style="width:56px;height:56px;border:2px solid rgba(201,148,58,.28);border-top-color:#C9943A;border-radius:50%;box-sizing:border-box;animation:vf-spin .9s linear infinite"></div><div style="font-size:12px;font-weight:800;letter-spacing:.2em;color:#C9943A">VICTORY FITNESS</div><div style="font-size:15px;color:rgba(247,243,238,.72)">Preparing your training space</div></div></div></div>`);
const ioniconsDirectory = path.join(root, 'dist', 'assets', 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'Fonts');
const ioniconsFile = fs.existsSync(ioniconsDirectory)
  ? fs.readdirSync(ioniconsDirectory).find((name) => name.startsWith('Ionicons.') && name.endsWith('.ttf'))
  : undefined;
const ioniconsPreload = ioniconsFile ? `<link rel="preload" href="/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/${ioniconsFile}" as="font" type="font/ttf" crossorigin>` : '';
const pwaHead = [
  '<meta name="theme-color" content="#0D0D0D">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Victory Fitness">',
  '<link rel="manifest" href="/manifest.webmanifest">',
  '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
  '<link rel="icon" href="/favicon.ico?v=6" sizes="any">',
  '<link rel="icon" type="image/png" href="/favicon.png?v=6" sizes="64x64">',
  '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(error){console.error("Service worker registration failed",error)})})}</script>',
].join('');
html = html.replace('</head>', `${ioniconsPreload}${pwaHead}<style>html,body{background:#0D0D0D}@keyframes vf-spin{to{transform:rotate(360deg)}}</style></head>`);
fs.writeFileSync(file, html);
console.log('Added the dependency-free web startup shell.');
