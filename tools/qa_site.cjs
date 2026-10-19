const path = require("node:path");
const fs = require("node:fs");

const dependencies =
  "C:\\Users\\19064\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules";
const { chromium } = require(path.join(dependencies, "playwright"));
const sharp = require(path.join(dependencies, "sharp"));

const url = "http://127.0.0.1:4173/";
const outputDir =
  "C:\\Users\\19064\\.codex\\visualizations\\2026\\10\\19\\01a154b0-892d-72d3-9be6-7aa7c292d478";

async function screenshotStats(page, filename) {
  const filePath = path.join(outputDir, filename);
  await page.screenshot({ path: filePath });
  const stats = await sharp(filePath).stats();
  return {
    filePath,
    channels: stats.channels.map((channel) => ({
      mean: Number(channel.mean.toFixed(2)),
      stdev: Number(channel.stdev.toFixed(2)),
    })),
  };
}

async function inspectViewport(browser, viewport, label) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const errors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`);
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const layout = await page.evaluate(() => {
    const visibleRect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };

    return {
      title: document.title,
      chapters: document.querySelectorAll(".chapter").length,
      photosInStory: document.querySelectorAll(".chapter img").length,
      scrollHeight: document.documentElement.scrollHeight,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      heroTitle: visibleRect(".hero h1"),
      heroGallery: visibleRect(".hero-gallery"),
      firstChapter: visibleRect(".chapter"),
      firstPair: visibleRect(".memory-pair"),
      firstPairPhoto: visibleRect(".memory-pair .memory-photo"),
      firstPairWords: visibleRect(".memory-pair .memory-words"),
      secondPairPhoto: visibleRect(".memory-pair:nth-child(2) .memory-photo"),
      secondPairWords: visibleRect(".memory-pair:nth-child(2) .memory-words"),
      textStyles: {
        kickerSize: getComputedStyle(document.querySelector(".chapter-kicker")).fontSize,
        captionSize: getComputedStyle(document.querySelector(".memory-text")).fontSize,
        captionColor: getComputedStyle(document.querySelector(".memory-text")).color,
      },
      river: {
        pathLength: document.querySelector("#riverMeasure").getTotalLength(),
        hasPath: Boolean(document.querySelector("#riverBed").getAttribute("d")),
        tipTransform: document.querySelector("#riverTip").style.transform,
        stageStrokes: Array.from(document.querySelectorAll(".river-stage")).map(
          (stage) => getComputedStyle(stage).stroke,
        ),
        stageCount: document.querySelectorAll(".river-stage").length,
        nodeLabels: Array.from(document.querySelectorAll(".river-node-label")).map(
          (node) => node.textContent.trim(),
        ),
      },
      maxImageRatioError: Math.max(
        ...Array.from(document.querySelectorAll(".chapter img"))
          .filter((image) => image.naturalWidth > 0 && image.naturalHeight > 0)
          .map((image) => {
            const rect = image.getBoundingClientRect();
            const renderedRatio = rect.width / rect.height;
            const naturalRatio = image.naturalWidth / image.naturalHeight;
            return Math.abs(renderedRatio - naturalRatio);
          }),
      ),
      ornaments: {
        hearts: document.querySelectorAll(".floating-heart").length,
        ribbons: document.querySelectorAll(".floating-ribbon").length,
        dogs: document.querySelectorAll(".river-dog").length,
        praiseWords: document.querySelectorAll(".praise-word").length,
        nightStars: document.querySelectorAll(".night-star").length,
      },
      swappedPhotoOrder: {
        chapter14: document.querySelector("#chapter-14 .memory-photo img")?.getAttribute("src"),
        chapter19: document.querySelector("#chapter-19 .memory-photo img")?.getAttribute("src"),
      },
      railVisible: getComputedStyle(document.querySelector("#chapterRail")).opacity,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      motionPressed: document.querySelector("#motionToggle").getAttribute("aria-pressed"),
    };
  });
  const audioTracks = await page.evaluate(async () => {
    const tracks = Array.isArray(window.MUSIC_PLAYLIST) ? window.MUSIC_PLAYLIST : [];
    return Promise.all(
      tracks.map(
        (source) =>
          new Promise((resolve) => {
            const audio = new Audio();
            const timeout = window.setTimeout(
              () => resolve({ source, loaded: false, error: "metadata timeout" }),
              10000,
            );
            audio.preload = "metadata";
            audio.addEventListener(
              "loadedmetadata",
              () => {
                window.clearTimeout(timeout);
                resolve({
                  source,
                  loaded: true,
                  duration: Number(audio.duration.toFixed(2)),
                });
              },
              { once: true },
            );
            audio.addEventListener(
              "error",
              () => {
                window.clearTimeout(timeout);
                resolve({ source, loaded: false, error: "media error" });
              },
              { once: true },
            );
            audio.src = source;
            audio.load();
          }),
      ),
    );
  });

  const heroShot = await screenshotStats(page, `${label}-hero.png`);
  const startY = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(4700);
  const autoY = await page.evaluate(() => window.scrollY);
  if (viewport.width < 760) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event("touchmove", { bubbles: true }));
    });
  } else {
    await page.mouse.move(720, 480);
    await page.mouse.wheel(0, 120);
  }
  await page.waitForTimeout(250);
  const manualWheelY = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(1450);
  const manualWheelYAfter = await page.evaluate(() => window.scrollY);

  await page.locator("#motionToggle").click();
  const pausedY = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(1400);
  const pausedYAfter = await page.evaluate(() => window.scrollY);

  await page.locator(".chapter").nth(9).scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const inStoryUI = await page.evaluate(() => ({
    railOpacity: getComputedStyle(document.querySelector("#chapterRail")).opacity,
    activeRailGroup: document.querySelector(".rail-dot.is-active")?.dataset.target || null,
    musicPressed: document.querySelector("#musicToggle").getAttribute("aria-pressed"),
  }));
  const chapterShot = await screenshotStats(page, `${label}-chapter-10.png`);

  await page.locator(".chapter").nth(9).locator(".photo-open").first().click();
  await page.waitForTimeout(350);
  const lightbox = await page.evaluate(() => ({
    open: document.querySelector("#lightbox").open,
    imageLoaded: document.querySelector("#lightboxImage").naturalWidth > 0,
    caption: document.querySelector("#lightboxCaption").textContent.trim(),
  }));
  const lightboxShot = await screenshotStats(page, `${label}-lightbox.png`);
  await page.locator("#lightboxNext").click();
  const lightboxCounter = await page.locator("#lightboxCounter").textContent();
  await page.locator("#lightbox .icon-button").click();
  await page.waitForTimeout(250);

  const specialEffects = {};
  for (const [group, selector, key] of [
    [6, ".heart-rise-layer", "heartRise"],
    [12, ".meteor-layer", "meteorShower"],
    [16, ".party-layer", "partyCannon"],
    [19, ".fireworks-layer", "fireworks"],
  ]) {
    await page.locator(`#chapter-${group}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(420);
    specialEffects[key] = await page.locator(selector).count();
  }
  specialEffects.celebrating = await page.evaluate(() =>
    document.body.classList.contains("celebrating"),
  );
  specialEffects.meteorGlints = await page.locator(".meteor-glint").count();
  specialEffects.fireworkParticles = Number(
    (await page.locator("canvas.fireworks-layer").getAttribute("data-particles")) || 0,
  );
  specialEffects.fireworksFullscreen = await page.evaluate(() => {
    const layer = document.querySelector(".fireworks-layer");
    if (!layer) return false;
    const rect = layer.getBoundingClientRect();
    return (
      Math.abs(rect.left) < 1 &&
      Math.abs(rect.top) < 1 &&
      Math.abs(rect.width - window.innerWidth) < 1 &&
      Math.abs(rect.height - window.innerHeight) < 1
    );
  });

  const chapterCount = await page.locator(".chapter").count();
  for (let index = 0; index < chapterCount; index += 1) {
    await page.locator(".chapter").nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1400);

  const imageStatus = await page.evaluate(() =>
    Array.from(document.images).map((image) => ({
      src: image.getAttribute("src"),
      complete: image.complete,
      naturalWidth: image.naturalWidth,
    })),
  );

  const endingShot = await screenshotStats(page, `${label}-ending.png`);
  const ending = await page.evaluate(() => ({
    visible: document.querySelector("#ending").classList.contains("is-visible"),
    strands: document.querySelectorAll(".finale-strand").length,
    strandLengths: Array.from(document.querySelectorAll(".finale-strand")).map((path) =>
      Number(path.getTotalLength().toFixed(1)),
    ),
    photoLoaded: document.querySelector(".ending-heart-photo img").naturalWidth > 0,
  }));
  const result = {
    label,
    layout,
    audioTracks,
    autoplayScroll: { startY, afterDelayY: autoY, moved: autoY > startY + 10 },
    manualPause: {
      pauseY: pausedY,
      afterY: pausedYAfter,
      held: Math.abs(pausedYAfter - pausedY) < 2,
    },
    manualWheel: {
      wheelY: manualWheelY,
      afterY: manualWheelYAfter,
      resumedAfterPause: manualWheelYAfter > manualWheelY + 2,
    },
    inStoryUI,
    specialEffects,
    ending,
    lightbox: { ...lightbox, counterAfterNext: lightboxCounter.trim() },
    images: {
      total: imageStatus.length,
      loaded: imageStatus.filter((image) => image.complete && image.naturalWidth > 0).length,
      broken: imageStatus.filter((image) => image.complete && image.naturalWidth === 0),
    },
    screenshots: { heroShot, chapterShot, lightboxShot, endingShot },
    errors,
    failedRequests,
  };

  await page.close();
  return result;
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });
  try {
    const desktop = await inspectViewport(browser, { width: 1440, height: 960 }, "desktop");
    const mobile = await inspectViewport(browser, { width: 390, height: 844 }, "mobile");
    console.log(JSON.stringify({ desktop, mobile }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
