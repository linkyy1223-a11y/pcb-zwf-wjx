# GitHub 上传清单

本地项目目录：

```text
C:\Users\19064\Desktop\王嘉轩\赵维凤
```

## 必须上传到仓库根目录

```text
index.html
styles.css
script.js
effects.js
story-data.js
music-playlist.js
CNAME
```

`CNAME` 的内容应为：

```text
zwf-wjx99.xyz
```

## 必须上传的资源

```text
assets/
├─ photos/
│  └─ 01-01.webp 等 41 张照片
├─ vendor/
│  └─ lucide.min.js
└─ music/
   ├─ song-01.m4a
   ├─ song-02.m4a
   ├─ song-03.m4a
   └─ song-04.m4a
```

## 不需要上传

```text
tools/
README.md
assets/music/README.md
assets/music/song-01.mp3
assets/music/song-02.mp3
assets/music/song-03.flac
assets/music/song-04.mp3
桌面上原始的 JPG/PNG 图片
```

## GitHub 网页上传步骤

1. 打开 GitHub 中存放这个网站的仓库。
2. 点击 `Add file`，选择 `Upload files`。
3. 上传根目录中的 6 个网页文件以及 `CNAME`。
4. 上传 `assets/photos/`、`assets/vendor/` 和 `assets/music/` 中四个 `.m4a` 文件；原始 `.mp3`、`.flac` 不需要上传。
5. 检查文件路径与本地保持一致。
6. 点击 `Commit changes`。
7. 等待 GitHub Pages 或 Actions 完成部署。
8. 打开 `https://zwf-wjx99.xyz/` 检查页面和音乐。

如果仓库中已经存在 `CNAME`、`.github` 或 `.nojekyll`，不要删除。
