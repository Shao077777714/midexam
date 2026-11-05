export const WEIRDCORE_VIDEO = '5fdJlEru1mw';

function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT.Player);
  return new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT.Player);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = reject;
    document.head.append(script);
  });
}

export function createSceneMusic({ dock, slot, status, toggle, loadPlayer = loadYouTube,
  fits = () => window.innerWidth >= 1100 && window.innerHeight >= 590,
  onPlaybackChange = () => {} }) {
  let player, ready = false, loading = false, desired = false, playing = false;
  let useVideo = true, failed = false, timeout, lastState;

  function setPlaying(value) {
    if (playing === value) return;
    playing = value;
    onPlaybackChange();
  }

  function fail() {
    clearTimeout(timeout);
    failed = true;
    desired = false;
    slot.hidden = true;
    toggle.hidden = true;
    status.textContent = '影片無法播放，目前使用遊戲音景。';
    player?.destroy();
    player = null;
    setPlaying(false);
  }

  function silence() {
    if (!ready || !player) return;
    player.mute();
    player.pauseVideo();
  }

  function play() {
    if (!ready || !desired) return;
    player.setVolume(20);
    player.unMute();
    player.playVideo();
  }

  function start() {
    if (loading) return;
    loading = true;
    timeout = setTimeout(fail, 12000);
    loadPlayer().then(Player => {
      if (failed) return;
      const document = slot.ownerDocument;
      const mount = slot.appendChild(document.createElement('div'));
      player = new Player(mount, {
        width: '360', height: '203', videoId: WEIRDCORE_VIDEO,
        playerVars: { origin: document.location.origin, playsinline: 1, loop: 1, playlist: WEIRDCORE_VIDEO },
        events: {
          onReady() {
            if (failed) return;
            clearTimeout(timeout);
            ready = true;
            if (desired) play(); else silence();
          },
          onStateChange({ data }) {
            if (failed) return;
            if (data === 1 && !desired) { silence(); return; }
            setPlaying(desired && data === 1);
            if (desired) status.textContent = data === 1 ? '怪核影像 · 播放中' : '怪核影像 · 可按播放鍵';
          },
          onAutoplayBlocked() {
            if (!desired) return;
            setPlaying(false);
            status.textContent = '請按影片的播放鍵。';
          },
          onError: fail,
        },
      });
    }).catch(fail);
  }

  function update(state) {
    lastState = state;
    const show = state.youtubeAllowed && state.active && !state.paused && !state.muted &&
      state.level < 5 && state.triggered && fits();
    const next = !!(show && useVideo && !failed);
    if (desired && !next) {
      desired = false;
      playing = false;
      silence();
    }
    dock.hidden = !show;
    slot.hidden = !next;
    if (!failed && show && !useVideo) status.textContent = '目前使用遊戲音景。';
    if (next && !desired) {
      desired = true;
      status.textContent = ready ? '怪核影像 · 可按播放鍵' : '正在載入怪核影像……';
      if (ready) play(); else start();
    }
    return desired && playing;
  }

  toggle.onclick = () => {
    useVideo = !useVideo;
    toggle.textContent = useVideo ? '使用遊戲音景' : '播放怪核影片';
    if (lastState) update(lastState);
    onPlaybackChange();
  };
  return { update };
}
