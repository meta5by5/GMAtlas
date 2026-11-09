// /wiki — friendly addresses for the static app's #/wiki portal page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const ORIGIN = 'https://dev.gmatlas.online';
const get = (path, method = 'GET') => worker.fetch(new Request(`${ORIGIN}${path}`, { method }), {});

test('/wiki and /wiki/<page> redirect to the app’s #/wiki portal page', async () => {
  for (const [path, to] of [['/wiki', '/#/wiki'], ['/wiki/', '/#/wiki'], ['/wiki/ent_abc123', '/#/wiki/ent_abc123']]) {
    const res = await get(path);
    assert.equal(res.status, 302, path);
    assert.equal(res.headers.get('location'), `${ORIGIN}${to}`, path);
  }
  assert.equal((await get('/wiki', 'HEAD')).status, 302);
});

test('anything else under /wiki is not redirected', async () => {
  for (const path of ['/wiki/a/b', '/wiki/bad%20id', '/wikipedia']) {
    const res = await get(path);
    assert.notEqual(res.status, 302, path);
  }
  assert.notEqual((await get('/wiki', 'POST')).status, 302, 'only GET and HEAD');
});
