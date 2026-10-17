(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const storyBody = document.querySelector("#storyBody");
  if (!storyBody) return;

  const praiseWords = /(可爱|美丽|美美)/g;
  const praiseWordTest = /(可爱|美丽|美美)/;
  const heartColors = ["#d87a8f", "#e7bd87", "#eab8c0", "#ad2448", "#8b91b8"];
  const fireworkColors = ["#ffd27a", "#ff7f9f", "#9ec7ff", "#c7a4ff", "#8de5c0", "#fff5df"];
  const triggered = new Set();
  let celebrationUnlocked = false;
  let fireworksCanvas = null;
  let fireworksContext = null;
  let fireworkParticles = [];
  let fireworkAnimationFrame = null;
  let fireworkLastTime = 0;
  let fireworksTimer = null;
  let dogDoodles = [];
  let dogFrame = null;

  const pad = (value) => String(value).padStart(2, "0");
  const random = (min, max) => min + Math.random() * (max - min);
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

  function decoratePraiseWords() {
    document.querySelectorAll(".memory-text").forEach((element) => {
      const content = element.textContent;
      if (!praiseWordTest.test(content)) return;
      element.innerHTML = escapeHTML(content).replace(
        praiseWords,
        (word) => `<span class="praise-word">${word}</span>`,
      );
    });
  }

  function createNightStars() {
    const container = document.querySelector("#nightStars");
    if (!container) return;
    const count = window.innerWidth < 760 ? 72 : 138;
    const colors = ["#fff9ed", "#ffe3a6", "#f4bfd0", "#c9d5ff"];

    for (let index = 0; index < count; index += 1) {
      const star = document.createElement("span");
      const size = random(1.2, 3.4);
      star.className = "night-star";
      star.style.left = `${random(0, 100)}%`;
      star.style.top = `${random(0, 100)}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.background = colors[index % colors.length];
      star.style.setProperty("--star-glow", `${random(4, 12)}px`);
      star.style.setProperty("--star-duration", `${random(2.2, 6.5)}s`);
      star.style.setProperty("--star-delay", `${random(-6, 0)}s`);
      star.style.setProperty("--star-opacity", `${random(0.48, 0.98)}`);
      container.append(star);
    }
  }

  function dogMarkup() {
    return `
      <svg viewBox="0 0 64 64" role="presentation">
        <ellipse cx="31" cy="56" rx="18" ry="4.5" fill="#6d2038" opacity=".12"></ellipse>
        <path class="dog-tail" d="M47 40c7-4 10-11 6-17" fill="none" stroke="#d8a84e" stroke-width="5" stroke-linecap="round"></path>
        <ellipse cx="31" cy="39" rx="17" ry="13" fill="#f5d487" stroke="#b88131" stroke-width="1.8"></ellipse>
        <path d="M16 24 11 12c8-2 13 3 16 8" fill="#d8a84e" stroke="#b88131" stroke-width="1.8" stroke-linejoin="round"></path>
        <path d="M38 20c4-7 10-9 15-5l-4 12" fill="#d8a84e" stroke="#b88131" stroke-width="1.8" stroke-linejoin="round"></path>
        <circle cx="29" cy="27" r="13" fill="#ffe7a8" stroke="#b88131" stroke-width="1.8"></circle>
        <circle cx="24" cy="25" r="1.8" fill="#4a2731"></circle>
        <circle cx="35" cy="25" r="1.8" fill="#4a2731"></circle>
        <ellipse cx="29.5" cy="31" rx="4.3" ry="3.1" fill="#4a2731"></ellipse>
        <path d="M27 34c1.5 2.4 3.7 2.5 5 0" fill="none" stroke="#9c435b" stroke-width="1.5" stroke-linecap="round"></path>
        <path d="M34 34c1.8 2.3 3.4 2.4 5 .3" fill="none" stroke="#c6546e" stroke-width="2" stroke-linecap="round"></path>
        <circle cx="18" cy="38" r="4" fill="#f3c86f" opacity=".8"></circle>
        <circle cx="44" cy="39" r="3.5" fill="#f3c86f" opacity=".75"></circle>
      </svg>
    `;
  }

  function createDogDoodles() {
    const indices = [2, 9, 16, 24, 33];
    const fragment = document.createDocumentFragment();
    dogDoodles = indices.map((index, dogIndex) => {
      const dog = document.createElement("span");
      dog.className = "river-dog";
      dog.dataset.pairIndex = String(index);
      dog.style.setProperty("--dog-delay", `${dogIndex * -0.7}s`);
      dog.innerHTML = dogMarkup();
      fragment.append(dog);
      return dog;
    });
    storyBody.append(fragment);
    positionDogDoodles();
  }

  function positionDogDoodles() {
    if (dogFrame) cancelAnimationFrame(dogFrame);
    dogFrame = requestAnimationFrame(() => {
      dogFrame = null;
      const pairs = document.querySelectorAll(".memory-pair");
      const bodyRect = storyBody.getBoundingClientRect();
      dogDoodles.forEach((dog) => {
        const pair = pairs[Number(dog.dataset.pairIndex)];
        if (!pair) {
          dog.hidden = true;
          return;
        }
        const rect = pair.getBoundingClientRect();
        dog.hidden = false;
        dog.style.left = `${storyBody.clientWidth * 0.5}px`;
        dog.style.top = `${rect.top - bodyRect.top + rect.height * 0.5}px`;
      });
    });
  }

  function createEffectLayer(className, duration) {
    const layer = document.createElement("div");
    layer.className = `effect-layer ${className}`;
    layer.setAttribute("aria-hidden", "true");
    document.body.append(layer);
    if (duration) window.setTimeout(() => layer.remove(), duration);
    return layer;
  }

  function playHeartRise() {
    if (reduceMotion) return;
    const layer = createEffectLayer("heart-rise-layer", 6200);
    for (let index = 0; index < 24; index += 1) {
      const heart = document.createElement("span");
      heart.className = "rising-heart";
      heart.textContent = "♥";
      heart.style.left = `${random(2, 96)}%`;
      heart.style.color = heartColors[index % heartColors.length];
      heart.style.fontSize = `${random(14, 34)}px`;
      heart.style.setProperty("--rise-duration", `${random(3.2, 5.2)}s`);
      heart.style.setProperty("--rise-delay", `${random(0, 1.1)}s`);
      heart.style.setProperty("--rise-drift", `${random(-9, 9)}rem`);
      heart.style.setProperty("--rise-fly", `${random(-18, 18)}rem`);
      layer.append(heart);
    }
  }

  function playMeteorShower() {
    if (reduceMotion) return;
    const layer = createEffectLayer("meteor-layer", 6800);
    for (let index = 0; index < 18; index += 1) {
      const meteor = document.createElement("span");
      meteor.className = "meteor";
      meteor.style.top = `${random(-12, 55)}vh`;
      meteor.style.left = `${random(-38, -12)}vw`;
      meteor.style.setProperty("--meteor-length", `${random(130, 320)}px`);
      meteor.style.setProperty("--meteor-delay", `${random(0, 2.4)}s`);
      meteor.style.setProperty("--meteor-duration", `${random(2.2, 3.7)}s`);
      meteor.style.setProperty("--meteor-color", heartColors[index % heartColors.length]);
      layer.append(meteor);
    }
    for (let index = 0; index < 42; index += 1) {
      const glint = document.createElement("span");
      glint.className = "meteor-glint";
      glint.style.left = `${random(4, 96)}%`;
      glint.style.top = `${random(4, 72)}%`;
      glint.style.setProperty("--glint-size", `${random(2, 5)}px`);
      glint.style.setProperty("--glint-delay", `${random(0, 2.5)}s`);
      glint.style.setProperty("--glint-color", fireworkColors[index % fireworkColors.length]);
      layer.append(glint);
    }
  }

  function playPartyCannon() {
    if (reduceMotion) return;
    const layer = createEffectLayer("party-layer", 4200);
    for (let index = 0; index < 54; index += 1) {
      const piece = document.createElement("span");
      const fromLeft = index % 2 === 0;
      piece.className = "party-piece";
      piece.style.left = fromLeft ? "1%" : "99%";
      piece.style.setProperty("--party-width", `${random(5, 11)}px`);
      piece.style.setProperty("--party-height", `${random(10, 23)}px`);
      piece.style.setProperty("--party-color", fireworkColors[index % fireworkColors.length]);
      piece.style.setProperty("--party-x", `${fromLeft ? random(15, 64) : -random(15, 64)}vw`);
      piece.style.setProperty("--party-y", `${random(-22, -68)}vh`);
      piece.style.setProperty("--party-end-x", `${fromLeft ? random(-8, 45) : random(-45, 8)}vw`);
      piece.style.setProperty("--party-delay", `${random(0, 0.55)}s`);
      piece.style.setProperty("--party-spin", `${random(420, 1080)}deg`);
      layer.append(piece);
    }
  }

  function resizeFireworksCanvas() {
    if (!fireworksCanvas || !fireworksContext) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fireworksCanvas.width = Math.round(window.innerWidth * dpr);
    fireworksCanvas.height = Math.round(window.innerHeight * dpr);
    fireworksCanvas.style.width = `${window.innerWidth}px`;
    fireworksCanvas.style.height = `${window.innerHeight}px`;
    fireworksContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensureFireworksCanvas() {
    if (fireworksCanvas) return;
    fireworksCanvas = document.createElement("canvas");
    fireworksCanvas.className = "fireworks-layer";
    fireworksCanvas.setAttribute("aria-hidden", "true");
    document.body.append(fireworksCanvas);
    fireworksContext = fireworksCanvas.getContext("2d");
    resizeFireworksCanvas();
  }

  function spawnFirework(options = {}) {
    if (!document.body.classList.contains("celebrating")) return;
    ensureFireworksCanvas();
    const {
      x = random(5, 95),
      y = random(8, 78),
      sparkCount = 30,
      speedMin = 90,
      speedMax = 260,
    } = options;
    const originX = (x / 100) * window.innerWidth;
    const originY = (y / 100) * window.innerHeight;
    const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];

    for (let index = 0; index < sparkCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkCount + random(-0.12, 0.12);
      const speed = random(speedMin, speedMax);
      const life = random(1.15, 2.1);
      fireworkParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: random(26, 48),
        life,
        maxLife: life,
        size: random(1.1, 2.2),
        color:
          index % 5 === 0
            ? fireworkColors[Math.floor(Math.random() * fireworkColors.length)]
            : color,
        heart: index % 19 === 0,
      });
    }
    fireworksCanvas.dataset.particles = String(fireworkParticles.length);
  }

  function clearFireworks() {
    fireworkParticles = [];
    if (fireworksContext && fireworksCanvas) {
      fireworksContext.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    }
    if (fireworksCanvas) fireworksCanvas.dataset.particles = "0";
  }

  function animateFireworks(time) {
    fireworkAnimationFrame = null;
    if (!document.body.classList.contains("celebrating")) {
      clearFireworks();
      return;
    }
    if (!fireworksContext || !fireworksCanvas) return;

    const delta = fireworkLastTime ? Math.min((time - fireworkLastTime) / 1000, 0.05) : 0.016;
    fireworkLastTime = time;
    const context = fireworksContext;
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";

    fireworkParticles = fireworkParticles.filter((particle) => {
      particle.life -= delta;
      if (particle.life <= 0) return false;
      const previousX = particle.x;
      const previousY = particle.y;
      particle.vx *= 0.993;
      particle.vy = particle.vy * 0.993 + particle.gravity * delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.globalAlpha = alpha * 0.96;
      context.strokeStyle = particle.color;
      context.lineWidth = particle.size;
      context.beginPath();
      context.moveTo(previousX, previousY);
      context.lineTo(particle.x, particle.y);
      context.stroke();
      context.globalAlpha = alpha * 0.72;
      context.fillStyle = "#fff9ed";
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * 0.45, 0, Math.PI * 2);
      context.fill();
      return true;
    });

    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    fireworksCanvas.dataset.particles = String(fireworkParticles.length);
    fireworkAnimationFrame = requestAnimationFrame(animateFireworks);
  }

  function startFireworksAnimation() {
    if (fireworkAnimationFrame) return;
    fireworkLastTime = performance.now();
    fireworkAnimationFrame = requestAnimationFrame(animateFireworks);
  }

  function unlockCelebration() {
    if (celebrationUnlocked) return;
    celebrationUnlocked = true;
    ensureFireworksCanvas();
    document.body.classList.add("celebrating");
    startFireworksAnimation();
    [
      { x: 12, y: 24, sparkCount: 34, speedMax: 275 },
      { x: 36, y: 58, sparkCount: 30, speedMax: 245 },
      { x: 62, y: 22, sparkCount: 34, speedMax: 285 },
      { x: 86, y: 52, sparkCount: 32, speedMax: 260 },
    ].forEach((burst, index) => {
      window.setTimeout(() => spawnFirework(burst), index * 140);
    });
    fireworksTimer = window.setInterval(() => {
      if (!document.body.classList.contains("celebrating")) return;
      spawnFirework({
        x: random(12, 88),
        y: random(12, 72),
        sparkCount: 30,
        speedMax: 265,
      });
      if (Math.random() > 0.55) {
        spawnFirework({
          x: random(8, 92),
          y: random(10, 74),
          sparkCount: 26,
          speedMax: 245,
        });
      }
    }, 1100);
  }

  function updateCelebrationVisibility() {
    const chapter19 = document.querySelector("#chapter-19");
    if (!chapter19) return;
    const active = chapter19.getBoundingClientRect().top <= window.innerHeight * 0.98;
    if (active && !celebrationUnlocked) unlockCelebration();
    document.body.classList.toggle("celebrating", active);
    if (active) startFireworksAnimation();
    else clearFireworks();
  }

  function initSpecialMoments() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const group = Number(entry.target.dataset.group);
          if (triggered.has(group)) return;
          triggered.add(group);
          observer.unobserve(entry.target);

          if (group === 6) playHeartRise();
          if (group === 12) playMeteorShower();
          if (group === 16) playPartyCannon();
          if (group === 19) unlockCelebration();
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );

    [6, 12, 16, 19].forEach((group) => {
      const chapter = document.querySelector(`#chapter-${group}`);
      if (chapter) observer.observe(chapter);
    });
  }

  decoratePraiseWords();
  createNightStars();
  createDogDoodles();
  initSpecialMoments();

  window.addEventListener("scroll", updateCelebrationVisibility, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      positionDogDoodles();
      resizeFireworksCanvas();
    },
    { passive: true },
  );
  window.addEventListener("load", positionDogDoodles, { once: true });

  if ("ResizeObserver" in window) {
    const dogObserver = new ResizeObserver(() => positionDogDoodles());
    dogObserver.observe(document.querySelector("#chapterList"));
  }

  window.setTimeout(updateCelebrationVisibility, 500);
})();
