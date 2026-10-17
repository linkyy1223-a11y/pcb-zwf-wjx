# 背景音乐目录

把自己的音乐文件放在这里，例如：

```text
assets/music/song-01.mp3
assets/music/song-02.mp3
assets/music/song-03.mp3
```

然后在项目根目录的 `music-playlist.js` 中填写：

```js
window.MUSIC_PLAYLIST = [
  "assets/music/song-01.mp3",
  "assets/music/song-02.mp3",
  "assets/music/song-03.mp3",
];
```

每次打开页面会从列表中随机选择第一首，一首播放结束后按列表顺序继续，最后一首结束后回到第一首循环。部署时需要把 `assets/music/` 和音频文件一起上传。

推荐使用 MP3，码率 128–192 kbps。M4A/AAC 也可以；不建议使用 WAV，因为文件过大。

手机浏览器通常会阻止有声自动播放。页面会先尝试自动播放，如果被系统拦截，会在用户第一次触摸、点击或按键后开始播放。
