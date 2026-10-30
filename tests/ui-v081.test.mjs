import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

test('v0.8.1 loads after v0.8 and creates a real streamer avatar frame', () => {
  const html=readFileSync('index.html','utf8');
  const prev=html.indexOf('theme-fars-v08.css');
  const fix=html.indexOf('theme-fars-v081.css');
  assert.ok(prev >= 0 && fix > prev, 'hotfix must load after original skin');
  assert.match(html, /class="global-avatar-frame"/);
  assert.match(html, /id="top-streamer-name"/);
});

test('canopy uses cropped artwork and profile crest exists', () => {
  const css=readFileSync('theme-fars-v081.css','utf8');
  assert.match(css,/top-canopy\.png/);
  assert.match(css,/height:75px/);
  assert.match(css,/profile-crest\.png/);
  assert.ok(existsSync('assets/ui/top-canopy.png'));
  assert.ok(existsSync('assets/ui-v07/profile-crest.png'));
});

test('live titles are centered; dice has a single transparent PNG layer', () => {
  const css=readFileSync('theme-fars-v081.css','utf8');
  assert.match(css,/\.control-panel #action-title/);
  assert.match(css,/text-align:center!important/);
  assert.match(css,/\.control-panel \.fars-dice-image\s*\{/);
  assert.match(css,/background:url\('\.\/assets\/ui-v07\/dice-luck\.png'\) center center\/contain no-repeat !important/);
  assert.ok(existsSync('assets/ui-v07/dice-luck.png'));
  assert.match(readFileSync('app.mjs','utf8'),/s\.lastRoll\?\.result/);
});
