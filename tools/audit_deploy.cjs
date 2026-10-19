const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const requiredRootFiles = [
  "index.html",
  "styles.css",
  "script.js",
  "effects.js",
  "story-data.js",
  "music-playlist.js",
  "CNAME",
  "assets/vendor/lucide.min.js",
  "assets/music/song-01.m4a",
  "assets/music/song-02.m4a",
  "assets/music/song-03.m4a",
  "assets/music/song-04.m4a",
];

const missing = requiredRootFiles.filter((file) => !fs.existsSync(path.join(root, file)));
const storyContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "story-data.js"), "utf8"), storyContext);
const musicContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "music-playlist.js"), "utf8"), musicContext);

const story = storyContext.window.STORY_DATA;
const photos = story.chapters.flatMap((chapter) =>
  chapter.photos.map((photo) => ({ group: chapter.group, ...photo })),
);
const missingPhotos = photos.filter((photo) => !fs.existsSync(path.join(root, photo.src)));
const missingMusic = musicContext.window.MUSIC_PLAYLIST.filter(
  (track) => !fs.existsSync(path.join(root, track)),
);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const htmlReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => !/^(?:data:|https?:|#)/.test(reference))
  .map((reference) => reference.split(/[?#]/)[0]);
const missingHtmlReferences = [...new Set(htmlReferences)].filter(
  (reference) => !fs.existsSync(path.join(root, reference)),
);

const deployFiles = [
  ...requiredRootFiles,
  ...fs
    .readdirSync(path.join(root, "assets/photos"))
    .filter((name) => name.endsWith(".webp"))
    .map((name) => `assets/photos/${name}`),
];
const totalBytes = deployFiles.reduce(
  (sum, file) => sum + fs.statSync(path.join(root, file)).size,
  0,
);

console.log(
  JSON.stringify(
    {
      missingRequiredFiles: missing,
      missingHtmlReferences,
      story: {
        title: story.title,
        chapters: story.chapters.length,
        photos: photos.length,
        missingPhotos,
      },
      music: {
        tracks: musicContext.window.MUSIC_PLAYLIST,
        missingMusic,
      },
      deployment: {
        fileCount: deployFiles.length,
        totalMB: Number((totalBytes / 1024 / 1024).toFixed(2)),
        cname: fs.readFileSync(path.join(root, "CNAME"), "utf8").trim(),
      },
    },
    null,
    2,
  ),
);
