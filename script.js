(() => {
  "use strict";

  const data = window.STORY_DATA;
  if (!data || !Array.isArray(data.chapters)) {
    return;
  }

  const chapterList = document.querySelector("#chapterList");
  const railDots = document.querySelector("#railDots");
  const railCurrent = document.querySelector("#railCurrent");
  const storyBody = document.querySelector("#storyBody");
  const riverSvg = document.querySelector("#riverSvg");
  const riverBed = document.querySelector("#riverBed");
  const riverFlow = document.querySelector("#riverFlow");
  const riverProgress = document.querySelector("#riverProgress");
  const riverTip = document.querySelector("#riverTip");
  const motionToggle = document.querySelector("#motionToggle");
  const motionLabel = document.querySelector("#motionLabel");
  const musicToggle = document.querySelector("#musicToggle");
  const musicLabel = document.querySelector("#musicLabel");
  const backToTop = document.querySelector("#backToTop");
  const lightbox = document.querySelector("#lightbox");
  const lightboxImage = document.querySelector("#lightboxImage");
  const lightboxCaption = document.querySelector("#lightboxCaption");
  const lightboxMeta = document.querySelector("#lightboxMeta");
  const lightboxCounter = document.querySelector("#lightboxCounter");
  const lightboxPrev = document.querySelector("#lightboxPrev");
  const lightboxNext = document.querySelector("#lightboxNext");
  const liveRegion = document.querySelector("#liveRegion");
  const story = document.querySelector("#story");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pad = (value) => String(value).padStart(2, "0");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const escapeHTML = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character],
    );

  const phaseFor = (group) => {
    if (group <= 9) return "dawn";
    if (group <= 17) return "bloom";
    return "promise";
  };

  const chaptersByGroup = new Map(data.chapters.map((chapter) => [chapter.group, chapter]));
  let activeGroup = null;
  let lastFocusedPhoto = null;
  let lightboxGroup = null;
  let lightboxIndex = 0;
  let riverLength = 0;
  let riverBuildFrame = null;
  let lastRiverProgress = -1;
  let lastNearestCheck = 0;
  let cachedNearestChapter = null;

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function renderChapters() {
    let photoSequence = 0;
    const chapterMarkup = data.chapters
      .map((chapter) => {
        const group = chapter.group;
        const pairs = chapter.photos
          .map((photo, index) => {
            const side = photoSequence % 2 === 0 ? "left" : "right";
            const photoTilt =
              photoSequence % 3 === 0 ? "-0.8deg" : photoSequence % 3 === 1 ? "0.7deg" : "-0.3deg";
            const ratioValue = (photo.width / photo.height).toFixed(4);
            const photoMaxWidth = Math.min(
              photo.width,
              Math.round((34 * 16 * photo.width) / photo.height),
            );
            photoSequence += 1;

            return `
              <article class="memory-pair" data-side="${side}">
                <figure
                  class="memory-photo"
                  style="--photo-ratio: ${ratioValue}; --photo-max-width: ${photoMaxWidth}px; --tilt: ${photoTilt}"
                >
                  <button
                    class="photo-open"
                    type="button"
                    data-photo-group="${group}"
                    data-photo-index="${index}"
                    aria-label="放大第 ${group} 段的第 ${index + 1} 张照片"
                  >
                    <img
                      src="${photo.src}"
                      alt="${escapeHTML(photo.caption)}"
                      width="${photo.width}"
                      height="${photo.height}"
                      loading="lazy"
                      decoding="async"
                    />
                    <span class="photo-zoom" aria-hidden="true">
                      <i data-lucide="maximize-2"></i>
                    </span>
                  </button>
                </figure>
                <div class="memory-words">
                  <span class="memory-heart" aria-hidden="true">♥</span>
                  <p class="memory-text">${escapeHTML(photo.caption)}</p>
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <section
            class="chapter"
            id="chapter-${group}"
            data-group="${group}"
            data-phase="${phaseFor(group)}"
            aria-labelledby="chapter-title-${group}"
          >
            <header class="chapter-header">
              <span class="chapter-number" aria-hidden="true">${pad(group)}</span>
              <div class="chapter-heading">
                <p class="chapter-kicker">第 ${pad(group)} 个瞬间</p>
                <h2 id="chapter-title-${group}">${escapeHTML(chapter.title)}</h2>
                <p class="chapter-note">${escapeHTML(chapter.note)}</p>
              </div>
            </header>
            <div class="memory-pairs">${pairs}</div>
          </section>
        `;
      })
      .join("");

    chapterList.innerHTML = chapterMarkup;

    railDots.innerHTML = data.chapters
      .map(
        (chapter) => `
          <button
            class="rail-dot"
            type="button"
            data-target="${chapter.group}"
            aria-label="前往第 ${chapter.group} 段：${escapeHTML(chapter.title)}"
            title="第 ${chapter.group} 段 · ${escapeHTML(chapter.title)}"
          ></button>
        `,
      )
      .join("");

    refreshIcons();
  }

  function smoothPath(points) {
    if (points.length < 2) return "";
    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let index = 0; index < points.length - 1; index += 1) {
      const previous = points[index - 1] || points[index];
      const current = points[index];
      const next = points[index + 1];
      const afterNext = points[index + 2] || next;
      const controlOneX = current.x + (next.x - previous.x) / 6;
      const controlOneY = current.y + (next.y - previous.y) / 6;
      const controlTwoX = next.x - (afterNext.x - current.x) / 6;
      const controlTwoY = next.y - (afterNext.y - current.y) / 6;
      path += ` C ${controlOneX.toFixed(2)} ${controlOneY.toFixed(2)}, ${controlTwoX.toFixed(2)} ${controlTwoY.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
    }

    return path;
  }

  function updateRiverProgress() {
    if (!riverLength || !riverProgress) return;
    const storyRect = storyBody.getBoundingClientRect();
    const progress = clamp(
      (window.innerHeight * 0.66 - storyRect.top) / Math.max(1, storyRect.height),
      0,
      1,
    );
    if (Math.abs(progress - lastRiverProgress) < 0.0007) return;
    lastRiverProgress = progress;
    const visibleLength = riverLength * progress;
    riverProgress.style.strokeDasharray = `${riverLength}`;
    riverProgress.style.strokeDashoffset = `${riverLength - visibleLength}`;

    if (typeof riverProgress.getPointAtLength === "function") {
      const point = riverProgress.getPointAtLength(visibleLength);
      riverTip.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
    }
  }

  function buildRiver() {
    const width = storyBody.clientWidth;
    const height = storyBody.scrollHeight;
    const pairs = Array.from(document.querySelectorAll(".memory-pair"));
    if (!width || !height || !pairs.length) return;

    const storyRect = storyBody.getBoundingClientRect();
    const compact = width < 820;
    const center = compact ? 18 : width * 0.5;
    const amplitude = compact ? 7 : Math.min(72, width * 0.052);
    const points = [{ x: center, y: 0 }];

    pairs.forEach((pair, index) => {
      const rect = pair.getBoundingClientRect();
      const direction = index % 2 === 0 ? 1 : -1;
      points.push({
        x: center + amplitude * direction,
        y: rect.top - storyRect.top + rect.height * 0.52,
      });
    });

    points.push({ x: center, y: height });
    const path = smoothPath(points);
    riverSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    riverBed.setAttribute("d", path);
    riverFlow.setAttribute("d", path);
    riverProgress.setAttribute("d", path);
    riverLength = riverProgress.getTotalLength();
    lastRiverProgress = -1;
    updateRiverProgress();
  }

  function scheduleRiverBuild() {
    if (riverBuildFrame) cancelAnimationFrame(riverBuildFrame);
    riverBuildFrame = requestAnimationFrame(() => {
      riverBuildFrame = null;
      buildRiver();
    });
  }

  function createFloatingHearts() {
    const container = document.querySelector("#floatingHearts");
    const count = window.innerWidth < 760 ? 12 : 22;
    const colors = ["#d87a8f", "#e7bd87", "#eab8c0", "#8b91b8"];

    for (let index = 0; index < count; index += 1) {
      const heart = document.createElement("span");
      const size = 8 + Math.random() * 13;
      heart.className = "floating-heart";
      heart.style.left = `${4 + Math.random() * 92}%`;
      heart.style.setProperty("--heart-size", `${size}px`);
      heart.style.setProperty("--heart-duration", `${13 + Math.random() * 14}s`);
      heart.style.setProperty("--heart-delay", `${Math.random() * -22}s`);
      heart.style.setProperty("--heart-drift-x", `${-7 + Math.random() * 14}rem`);
      heart.style.setProperty("--heart-opacity", `${0.24 + Math.random() * 0.24}`);
      heart.style.setProperty("--heart-color", colors[index % colors.length]);
      container.append(heart);
    }
  }

  function createFloatingRibbons() {
    const container = document.querySelector("#floatingRibbons");
    const count = window.innerWidth < 760 ? 10 : 18;
    const colors = ["#d87a8f", "#e7bd87", "#eab8c0", "#8b91b8", "#fff9f4"];

    for (let index = 0; index < count; index += 1) {
      const ribbon = document.createElement("span");
      ribbon.className = "floating-ribbon";
      ribbon.style.left = `${2 + Math.random() * 96}%`;
      ribbon.style.setProperty("--ribbon-width", `${5 + Math.random() * 6}px`);
      ribbon.style.setProperty("--ribbon-height", `${14 + Math.random() * 14}px`);
      ribbon.style.setProperty("--ribbon-color", colors[index % colors.length]);
      ribbon.style.setProperty("--ribbon-duration", `${10 + Math.random() * 10}s`);
      ribbon.style.setProperty("--ribbon-delay", `${Math.random() * -16}s`);
      ribbon.style.setProperty("--ribbon-drift", `${-6 + Math.random() * 12}rem`);
      ribbon.style.setProperty("--ribbon-spin", `${220 + Math.random() * 520}deg`);
      container.append(ribbon);
    }
  }

  function burstHearts(event) {
    if (reduceMotion) return;
    const container = document.querySelector("#floatingHearts");
    const originX = event?.clientX || window.innerWidth / 2;
    const originY = event?.clientY || window.innerHeight / 2;

    for (let index = 0; index < 10; index += 1) {
      const heart = document.createElement("span");
      heart.className = "heart-burst";
      heart.style.left = `${originX}px`;
      heart.style.top = `${originY}px`;
      heart.style.setProperty("--burst-x", `${-90 + Math.random() * 180}px`);
      heart.style.setProperty("--burst-y", `${-130 - Math.random() * 110}px`);
      heart.style.setProperty("--burst-rotate", `${-80 + Math.random() * 160}deg`);
      heart.style.setProperty("--burst-delay", `${index * 18}ms`);
      heart.style.setProperty("--burst-size", `${7 + Math.random() * 8}px`);
      heart.addEventListener("animationend", () => heart.remove(), { once: true });
      container.append(heart);
    }
  }

  function observeChapters() {
    const chapters = document.querySelectorAll(".chapter");

    if (!("IntersectionObserver" in window) || reduceMotion) {
      chapters.forEach((chapter) => chapter.classList.add("is-visible"));
      return;
    }

    document.documentElement.classList.add("js-reveal");
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    chapters.forEach((chapter) => revealObserver.observe(chapter));
  }

  const autoScroll = {
    enabled: !reduceMotion,
    speed: 30,
    lastTime: performance.now(),
    position: window.scrollY,
    pausedUntil: 0,
    rafFrame: null,
    fallbackTimer: null,
    startTimer: null,
    started: false,
    moving: false,
    setMoving(moving) {
      if (this.moving === moving) return;
      this.moving = moving;
      document.documentElement.classList.toggle("auto-scrolling", moving);
    },
    startScheduler() {
      if (this.rafFrame || this.fallbackTimer) return;
      this.lastTime = performance.now();
      this.position = window.scrollY;
      const frame = (time) => {
        this.rafFrame = null;
        if (!this.enabled) return;
        this.step(time);
        if (this.enabled) this.rafFrame = requestAnimationFrame(frame);
      };
      this.rafFrame = requestAnimationFrame(frame);
      this.fallbackTimer = window.setInterval(() => {
        if (!this.enabled) return;
        const now = performance.now();
        if (now - this.lastTime > 90) this.step(now);
      }, 90);
    },
    stopScheduler() {
      if (this.rafFrame) cancelAnimationFrame(this.rafFrame);
      if (this.fallbackTimer) window.clearInterval(this.fallbackTimer);
      this.rafFrame = null;
      this.fallbackTimer = null;
      this.setMoving(false);
    },
    setEnabled(enabled) {
      this.enabled = enabled;
      if (enabled) {
        this.lastTime = performance.now();
        this.position = window.scrollY;
        this.pausedUntil = 0;
        if (this.startTimer) {
          window.clearTimeout(this.startTimer);
          this.startTimer = null;
        }
        this.started = true;
        this.startScheduler();
        updateMotionUI(true);
      } else {
        this.stopScheduler();
        updateMotionUI(false);
      }
    },
    startAfterDelay(delay = 4200) {
      if (!this.enabled || this.started || reduceMotion) return;
      this.startTimer = window.setTimeout(() => {
        this.started = true;
      }, delay);
      this.startScheduler();
    },
    pauseFor(milliseconds) {
      this.pausedUntil = performance.now() + milliseconds;
      this.position = window.scrollY;
      this.setMoving(false);
    },
    step(time = performance.now()) {
      const delta = Math.min(Math.max(time - this.lastTime, 0), 64);
      this.lastTime = time;
      const documentHeight = document.documentElement.scrollHeight;
      const atEnd = window.scrollY + window.innerHeight >= documentHeight - 3;
      const shouldMove =
        this.enabled &&
        this.started &&
        !document.hidden &&
        !lightbox.open &&
        !atEnd &&
        time >= this.pausedUntil;

      this.setMoving(shouldMove);
      if (shouldMove && delta > 0) {
        this.position += (this.speed * delta) / 1000;
        window.scrollTo(0, this.position);
      } else {
        this.position = window.scrollY;
      }
    },
  };

  function updateMotionUI(enabled) {
    motionToggle.setAttribute("aria-pressed", String(enabled));
    motionToggle.title = enabled ? "暂停自动滚动" : "继续自动滚动";
    motionLabel.textContent = enabled ? "缓滚中" : "继续缓滚";
    motionToggle.innerHTML = `<i data-lucide="${enabled ? "pause" : "play"}" aria-hidden="true"></i><span id="motionLabel">${enabled ? "缓滚中" : "继续缓滚"}</span>`;
    refreshIcons();
  }

  class MemoryMusic {
    constructor() {
      this.context = null;
      this.master = null;
      this.timer = null;
      this.nextLoop = 0;
      this.playing = false;
      this.audioElement = null;
      this.externalSource = document.body.dataset.musicSrc?.trim() || "";
      this.playlist = Array.isArray(window.MUSIC_PLAYLIST)
        ? window.MUSIC_PLAYLIST.map((source) => String(source).trim()).filter(Boolean)
        : [];
      this.playlistIndex = 0;
      this.failedTrackAttempts = 0;
    }

    async start() {
      if (this.playing) return true;
      if (this.playlist.length || this.externalSource) return this.startExternal();
      return this.startGenerated();
    }

    tracks() {
      return this.playlist.length ? this.playlist : this.externalSource ? [this.externalSource] : [];
    }

    async startExternal() {
      const tracks = this.tracks();
      if (!tracks.length) throw new Error("No external music source");
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.preload = "auto";
        this.audioElement.volume = 0.48;
        this.playlistIndex = Math.floor(Math.random() * tracks.length);
        this.audioElement.src = tracks[this.playlistIndex];
        this.audioElement.addEventListener("ended", () => this.playNextTrack());
        this.audioElement.addEventListener("error", () => {
          if (this.playing) this.playNextTrack();
        });
      }
      this.audioElement.loop = tracks.length === 1;
      try {
        await this.audioElement.play();
      } catch (error) {
        if (error?.name === "NotAllowedError" || tracks.length === 1) throw error;
        this.failedTrackAttempts += 1;
        if (this.failedTrackAttempts >= tracks.length) {
          this.failedTrackAttempts = 0;
          throw error;
        }
        this.playNextTrack();
        return this.startExternal();
      }
      this.failedTrackAttempts = 0;
      this.playing = true;
      return true;
    }

    playNextTrack() {
      const tracks = this.tracks();
      if (!tracks.length || !this.audioElement) return;
      this.playlistIndex = (this.playlistIndex + 1) % tracks.length;
      this.audioElement.src = tracks[this.playlistIndex];
      this.audioElement.loop = tracks.length === 1;
      if (!this.playing) return;
      this.audioElement.play().catch((error) => {
        if (error?.name !== "NotAllowedError") this.playNextTrack();
      });
    }

    createReverb(context) {
      const duration = 2.1;
      const frameCount = Math.floor(context.sampleRate * duration);
      const impulse = context.createBuffer(2, frameCount, context.sampleRate);

      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const samples = impulse.getChannelData(channel);
        for (let index = 0; index < frameCount; index += 1) {
          const decay = Math.pow(1 - index / frameCount, 2.7);
          samples[index] = (Math.random() * 2 - 1) * decay;
        }
      }

      const convolver = context.createConvolver();
      convolver.buffer = impulse;
      return convolver;
    }

    createContext() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio is not available");

      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.72;
      this.reverb = this.createReverb(this.context);
      const wet = this.context.createGain();
      wet.gain.value = 0.2;
      this.master.connect(this.context.destination);
      this.reverb.connect(wet);
      wet.connect(this.master);
    }

    async startGenerated() {
      this.createContext();
      await this.context.resume();

      if (this.context.state !== "running") {
        await this.context.close();
        this.context = null;
        this.master = null;
        throw new Error("Audio playback requires a user gesture");
      }

      this.playing = true;
      this.nextLoop = this.context.currentTime + 0.15;
      this.scheduleAhead();
      this.timer = window.setInterval(() => this.scheduleAhead(), 1200);
      return true;
    }

    playTone(frequency, start, duration, volume, type = "sine", pan = 0) {
      if (!this.context || !this.master) return;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const panner = this.context.createStereoPanner
        ? this.context.createStereoPanner()
        : null;
      const noteStart = Math.max(this.context.currentTime + 0.02, start);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(volume, noteStart + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

      if (panner) {
        panner.pan.value = pan;
        oscillator.connect(gain);
        gain.connect(panner);
        panner.connect(this.master);
        panner.connect(this.reverb);
      } else {
        oscillator.connect(gain);
        gain.connect(this.master);
        gain.connect(this.reverb);
      }

      oscillator.start(noteStart);
      oscillator.stop(noteStart + duration + 0.08);
    }

    scheduleLoop(start) {
      const beat = 1.08;
      const loopLength = beat * 16;
      const chords = [
        [130.81, 196.0, 261.63, 329.63],
        [110.0, 164.81, 220.0, 261.63],
        [87.31, 130.81, 174.61, 220.0],
        [98.0, 146.83, 196.0, 246.94],
      ];
      const melody = [
        [0, 659.25, 1.65],
        [1.7, 783.99, 1.05],
        [3.05, 587.33, 1.4],
        [4.15, 523.25, 1.75],
        [6.05, 440.0, 1.1],
        [7.2, 392.0, 1.45],
        [8.3, 440.0, 1.15],
        [9.6, 523.25, 1.55],
        [11.35, 659.25, 1.2],
        [12.45, 587.33, 1.3],
        [13.85, 493.88, 1.25],
        [15.2, 392.0, 1.45],
      ];

      chords.forEach((chord, chordIndex) => {
        const chordStart = start + chordIndex * beat * 4;
        chord.forEach((frequency, noteIndex) => {
          this.playTone(
            frequency,
            chordStart,
            beat * 4.8,
            noteIndex === 0 ? 0.011 : 0.007,
            "sine",
            [-0.42, -0.14, 0.14, 0.42][noteIndex],
          );
        });
      });

      melody.forEach(([offset, frequency, duration], noteIndex) => {
        this.playTone(
          frequency,
          start + offset * beat,
          duration * beat,
          noteIndex % 3 === 0 ? 0.033 : 0.026,
          "triangle",
          Math.sin(noteIndex * 1.7) * 0.42,
        );
      });

      return loopLength;
    }

    scheduleAhead() {
      if (!this.playing || !this.context) return;
      const horizon = this.context.currentTime + 3;
      while (this.nextLoop < horizon) {
        const loopLength = this.scheduleLoop(this.nextLoop);
        this.nextLoop += loopLength;
      }
    }

    async stop() {
      this.playing = false;

      if (this.audioElement) {
        this.audioElement.pause();
      }

      if (this.timer) {
        window.clearInterval(this.timer);
        this.timer = null;
      }

      if (this.context) {
        const context = this.context;
        const master = this.master;
        this.context = null;
        this.master = null;
        if (master) {
          master.gain.cancelScheduledValues(context.currentTime);
          master.gain.setValueAtTime(master.gain.value, context.currentTime);
          master.gain.linearRampToValueAtTime(0.0001, context.currentTime + 0.25);
        }
        window.setTimeout(() => {
          context.close().catch(() => {});
        }, 320);
      }
    }

    async toggle() {
      if (this.playing) {
        await this.stop();
        return false;
      }
      await this.start();
      return true;
    }
  }

  const memoryMusic = new MemoryMusic();

  function setMusicUI(playing) {
    musicToggle.setAttribute("aria-pressed", String(playing));
    musicToggle.title = playing ? "暂停背景音乐" : "播放背景音乐";
    musicToggle.innerHTML = `<i data-lucide="${playing ? "pause" : "music-2"}" aria-hidden="true"></i><span id="musicLabel">${playing ? "音乐中" : "音乐"}</span>`;
    refreshIcons();
  }

  async function startMusic() {
    try {
      await memoryMusic.start();
      setMusicUI(true);
      return true;
    } catch {
      setMusicUI(false);
      return false;
    }
  }

  async function attemptAutoplay() {
    const started = await startMusic();
    if (!started) {
      musicToggle.title = "轻触页面或此按钮播放背景音乐";
    }
  }

  const startMusicOnGesture = async (event) => {
    if (event.target.closest("#musicToggle")) return;
    const started = await startMusic();
    if (started) {
      document.removeEventListener("pointerdown", startMusicOnGesture, true);
      document.removeEventListener("keydown", startMusicOnGesture, true);
    }
  };

  musicToggle.addEventListener("click", async () => {
    document.removeEventListener("pointerdown", startMusicOnGesture, true);
    document.removeEventListener("keydown", startMusicOnGesture, true);
    try {
      const playing = await memoryMusic.toggle();
      setMusicUI(playing);
      liveRegion.textContent = playing ? "背景音乐已开启" : "背景音乐已暂停";
    } catch {
      setMusicUI(false);
      liveRegion.textContent = "背景音乐暂时无法播放";
    }
  });

  motionToggle.addEventListener("click", () => {
    autoScroll.setEnabled(!autoScroll.enabled);
    liveRegion.textContent = autoScroll.enabled ? "自动缓慢滚动已开启" : "自动缓慢滚动已暂停";
  });

  function currentLightboxPhotos() {
    return lightboxGroup ? chaptersByGroup.get(lightboxGroup)?.photos || [] : [];
  }

  function setLightboxPhoto(index) {
    const photos = currentLightboxPhotos();
    const chapter = chaptersByGroup.get(lightboxGroup);
    if (!photos.length || !chapter) return;

    lightboxIndex = (index + photos.length) % photos.length;
    const photo = photos[lightboxIndex];
    lightboxImage.src = photo.src;
    lightboxImage.width = photo.width;
    lightboxImage.height = photo.height;
    lightboxImage.alt = photo.caption;
    lightboxCaption.textContent = photo.caption;
    lightboxMeta.textContent = `第 ${pad(chapter.group)} 段 · ${chapter.title}`;
    lightboxCounter.textContent = `${pad(lightboxIndex + 1)} / ${pad(photos.length)}`;
    lightboxPrev.hidden = photos.length < 2;
    lightboxNext.hidden = photos.length < 2;
  }

  function openLightbox(group, index, trigger, event) {
    const chapter = chaptersByGroup.get(group);
    if (!chapter?.photos.length) return;
    lastFocusedPhoto = trigger;
    lightboxGroup = group;
    setLightboxPhoto(index);

    if (typeof lightbox.showModal === "function") {
      lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }

    document.body.classList.add("no-scroll");
    autoScroll.pauseFor(1200);
    burstHearts(event);
  }

  chapterList.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-photo-group]");
    if (!trigger) return;
    openLightbox(
      Number(trigger.dataset.photoGroup),
      Number(trigger.dataset.photoIndex),
      trigger,
      event,
    );
  });

  lightboxPrev.addEventListener("click", () => setLightboxPhoto(lightboxIndex - 1));
  lightboxNext.addEventListener("click", () => setLightboxPhoto(lightboxIndex + 1));

  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setLightboxPhoto(lightboxIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setLightboxPhoto(lightboxIndex + 1);
    }
  });

  lightbox.addEventListener("close", () => {
    document.body.classList.remove("no-scroll");
    lightboxGroup = null;
    if (lastFocusedPhoto && document.contains(lastFocusedPhoto)) {
      lastFocusedPhoto.focus();
    }
  });

  railDots.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-target]");
    if (!dot) return;
    const target = document.querySelector(`#chapter-${dot.dataset.target}`);
    if (!target) return;
    autoScroll.pauseFor(7000);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  backToTop.addEventListener("click", () => {
    autoScroll.pauseFor(4000);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function nearestChapter() {
    const chapters = document.querySelectorAll(".chapter");
    if (!chapters.length) return null;
    const viewportAnchor = window.innerHeight * 0.46;
    let nearest = chapters[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    chapters.forEach((chapter) => {
      const rect = chapter.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height * 0.35 - viewportAnchor);
      if (distance < nearestDistance) {
        nearest = chapter;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  let scrollFrame = null;
  function updateScrollUI() {
    scrollFrame = null;
    const scrollTop = window.scrollY;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pageProgress = clamp(scrollTop / maxScroll, 0, 1);
    document.documentElement.style.setProperty("--page-progress", `${pageProgress * 100}%`);
    document.body.classList.toggle("is-scrolled", scrollTop > 60);
    backToTop.classList.toggle("is-visible", scrollTop > window.innerHeight * 0.8);

    const storyRect = story.getBoundingClientRect();
    const storyVisible = storyRect.top < window.innerHeight && storyRect.bottom > 0;
    document.body.classList.toggle("story-in-view", storyVisible);

    updateRiverProgress();

    const now = performance.now();
    if (!cachedNearestChapter || now - lastNearestCheck > 120) {
      cachedNearestChapter = nearestChapter();
      lastNearestCheck = now;
    }
    const nearest = cachedNearestChapter;
    if (nearest) {
      const group = Number(nearest.dataset.group);
      if (group !== activeGroup) {
        activeGroup = group;
        railCurrent.textContent = pad(group);
        railDots.querySelectorAll(".rail-dot").forEach((dot) => {
          dot.classList.toggle("is-active", Number(dot.dataset.target) === group);
        });
      }
    }
  }

  window.addEventListener(
    "scroll",
    () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(updateScrollUI);
    },
    { passive: true },
  );

  window.addEventListener("resize", () => {
    scheduleRiverBuild();
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(updateScrollUI);
  });

  window.addEventListener("wheel", () => autoScroll.pauseFor(4200), { passive: true });
  window.addEventListener("touchstart", () => autoScroll.pauseFor(5200), { passive: true });
  window.addEventListener("touchmove", () => autoScroll.pauseFor(4200), { passive: true });
  window.addEventListener("touchend", () => autoScroll.pauseFor(2600), { passive: true });
  window.addEventListener("touchcancel", () => autoScroll.pauseFor(2600), { passive: true });

  window.addEventListener(
    "keydown",
    (event) => {
      if (!["ArrowDown", "PageDown", " ", "End"].includes(event.key)) return;
      autoScroll.pauseFor(4200);
    },
    { passive: true },
  );

  document.addEventListener("pointerdown", () => autoScroll.pauseFor(3200), { passive: true });

  renderChapters();
  scheduleRiverBuild();
  createFloatingHearts();
  createFloatingRibbons();
  observeChapters();
  updateScrollUI();

  if ("ResizeObserver" in window) {
    const riverResizeObserver = new ResizeObserver(() => scheduleRiverBuild());
    riverResizeObserver.observe(chapterList);
  }

  window.addEventListener("load", scheduleRiverBuild, { once: true });

  if (reduceMotion) {
    updateMotionUI(false);
  } else {
    autoScroll.startAfterDelay();
  }

  document.addEventListener("pointerdown", startMusicOnGesture, true);
  document.addEventListener("keydown", startMusicOnGesture, true);
  window.setTimeout(attemptAutoplay, 650);
})();
