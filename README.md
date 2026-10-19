# 赵维凤与王嘉轩

一个记录相遇、相识与相知的长页面。页面会按照片文件名开头的数字自动分组，当前共 21 段故事、41 张照片。

## 本地预览

在项目目录运行：

```powershell
python -m http.server 4173
```

然后打开 `http://127.0.0.1:4173/`。

## 页面内容

- `index.html`：页面结构
- `styles.css`：视觉样式、响应式布局和动画
- `script.js`：自动缓滚、照片灯箱、音乐和交互
- `story-data.js`：根据照片文件名生成的故事数据
- `assets/photos/`：适合网页加载的 WebP 图片
- `tools/prepare_site_assets.py`：重新压缩照片并生成 `story-data.js`

## 替换音乐

没有配置音乐列表时，页面使用浏览器 Web Audio 生成的原创轻音乐占位旋律。

如果要使用自己的歌：

1. 把音乐文件放到 `assets/music/`，推荐使用 MP3。
2. 在 `music-playlist.js` 中填写文件地址：

```js
window.MUSIC_PLAYLIST = [
  "assets/music/song-01.m4a",
  "assets/music/song-02.m4a",
  "assets/music/song-03.m4a",
  "assets/music/song-04.m4a",
];
```

每次打开页面都会从 `song-01.m4a` 开始，播放结束后按列表顺序继续并循环。手机和弱网环境会优先避开体积较大的音轨，减少首播等待。浏览器通常禁止在有声音的情况下完全自动播放。页面会先尝试播放，失败后会在首次点击或按键时自动开始。

## 修改故事

照片会按“序号-同名组内顺序”显示。每段的标题和引导文字在 `tools/prepare_site_assets.py` 的 `GROUP_META` 中，照片下面的原文直接来自文件名去掉开头序号后的部分。

修改标题或说明后，运行：

```powershell
python tools/prepare_site_assets.py
```

这会重新生成 `assets/photos/` 和 `story-data.js`。
