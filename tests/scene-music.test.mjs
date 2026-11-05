import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneMusic } from '../public/scene-music.mjs';
import { createAudioDirector } from '../public/audio-director.mjs';

const exploring = { level: 0, triggered: true, youtubeAllowed: true, active: true };

test('the requested video takes over only when playing in a visible weirdcore scene', async () => {
  const ownerDocument = { createElement: () => ({}), location: { origin: 'http://127.0.0.1:4173' } };
  const dock = {}, slot = { ownerDocument, appendChild: item => item }, status = {}, toggle = {};
  let options, loads = 0;
  const calls = [];
  class Player {
    constructor(_, config) { options = config; }
    playVideo() { calls.push('play'); }
    pauseVideo() { calls.push('pause'); }
    mute() { calls.push('mute'); }
    unMute() { calls.push('unmute'); }
    setVolume() {}
    destroy() { calls.push('destroy'); }
  }
  const music = createSceneMusic({ dock, slot, status, toggle, fits: () => true,
    loadPlayer: async () => { loads++; return Player; } });
  assert.equal(music.update({ ...exploring, triggered: false }), false);
  assert.equal(music.update({ ...exploring, level: 5 }), false);
  assert.equal(loads, 0);
  assert.equal(music.update(exploring), false);
  await Promise.resolve();
  assert.equal(options.videoId, '5fdJlEru1mw');
  assert.equal(dock.hidden, false);
  assert.equal(slot.hidden, false);
  assert.equal(music.update({ ...exploring, paused: true }), false);
  options.events.onReady();
  assert.deepEqual(calls, ['mute', 'pause']);
  assert.equal(dock.hidden, true);
  music.update(exploring);
  options.events.onAutoplayBlocked();
  assert.equal(music.update(exploring), false);
  assert.match(status.textContent, /播放鍵/);
  options.events.onStateChange({ data: 1 });
  assert.equal(music.update(exploring), true);
  assert.equal(music.update({ ...exploring, muted: true }), false);
  assert.deepEqual(calls.slice(-2), ['mute', 'pause']);
  options.events.onStateChange({ data: 1 }); // Late playback after a pause must also be stopped.
  assert.deepEqual(calls.slice(-2), ['mute', 'pause']);
  music.update(exploring);
  options.events.onError({ data: 150 });
  assert.equal(music.update(exploring), false);
  assert.equal(slot.hidden, true);
  assert.match(status.textContent, /遊戲音景/);
  assert.equal(loads, 1);
});

test('audio director loads Gone Beyond and restores the local mix when the video stops', async () => {
  const fetched = [];
  const node = () => ({ connect() {}, start() {}, stop() {}, gain: { setTargetAtTime(v) { this.value = v; } } });
  class Context {
    state = 'running'; currentTime = 0;
    createGain = node; createBufferSource = node;
    async decodeAudioData() { return {}; }
    close() {}
  }
  const state = { ...exploring, triggered: false };
  let playing = false;
  const audio = createAudioDirector({ snapshot: () => state, AudioContextClass: Context,
    sceneMusic: { update: () => playing }, fetchFn: async url => {
      fetched.push(url.pathname);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
    } });
  await audio.init();
  assert.ok(fetched.some(path => path.endsWith('/ambience/gone-beyond.mp3')));
  assert.equal(audio.tracks.dream.gain.gain.value, .22);
  state.triggered = true;
  playing = true;
  audio.update();
  assert.equal(audio.tracks.weird.gain.gain.value, 0);
  playing = false;
  audio.update();
  assert.equal(audio.tracks.weird.gain.gain.value, .25);
  audio.dispose();
});
