import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const serviceWorker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

test('service worker rotates the cache when API caching rules change', () => {
  assert.match(serviceWorker, /victory-fitness-v6/);
});

test('same-origin API requests bypass all cache reads and writes', () => {
  const apiBypass = serviceWorker.indexOf("url.pathname.startsWith('/api/')");
  const generalCacheLookup = serviceWorker.indexOf('caches.match(event.request)');

  assert.notEqual(apiBypass, -1);
  assert.notEqual(generalCacheLookup, -1);
  assert.ok(apiBypass < generalCacheLookup);
  assert.match(
    serviceWorker.slice(apiBypass, generalCacheLookup),
    /event\.respondWith\(fetch\(event\.request\)\)/,
  );
});
