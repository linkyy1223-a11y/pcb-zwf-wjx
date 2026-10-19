# 背景音乐目录

把自己的音乐文件放在这里，例如：

```text
assets/music/song-01.m4a
assets/music/song-02.m4a
assets/music/song-03.m4a
assets/music/song-04.m4a
```

然后在项目根目录的 `music-playlist.js` 中填写：

```js
window.MUSIC_PLAYLIST = [
  "assets/music/song-01.m4a",
  "assets/music/song-02.m4a",
  "assets/music/song-03.m4a",
  "assets/music/song-04.m4a",
];
```

每次打开页面都会从 `song-01.m4a` 开始，一首播放结束后按列表顺序继续，最后一首结束后回到第一首循环。部署时需要把 `assets/music/` 和音频文件一起上传。

当前网页使用 128 kbps 的 M4A/AAC 版本，单首约 4–5 MB，并已开启 `faststart` 以加快手机首播。原始 MP3/FLAC 可以继续保留在本地，但不需要上传。

手机浏览器通常会阻止有声自动播放。页面会先尝试自动播放，如果被系统拦截，会在用户第一次触摸、点击或按键后开始播放。
