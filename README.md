# audio-sculptor

[![NPM](https://nodei.co/npm/ffmpeg.js.png?downloads=true)](https://www.npmjs.com/package/audio-sculptor)

`audio-sculptor` 是一个支持在浏览器进行音频处理的库，支持音频裁剪、拼接、切割等操作。

## 特性

- 仅在浏览器环境即可处理音频，无需服务端；
- 采用 worker 异步处理音频，不会阻塞页面 UI;
- 支持音频的裁剪、切割和拼接(当前支持 `mp3` / `webm` 格式)；

## 安装

npm

```
npm install audio-sculptor
```

yarn

```
yarn add audio-sculptor
```

## API 文档

详情可戳 [api.md](https://github.com/JS-Hao/audio-sculptor/blob/master/docs/api.md)

## 项目计划

- V1.6 提升计算性能，ffmpeg wasm 化
