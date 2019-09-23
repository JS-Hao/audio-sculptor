# audio-sculptor

`audio-sculptor`是一个支持在浏览器进行音频处理的库，支持音频裁剪、拼接、切割等操作。

## 特性

- 仅在浏览器环境即可处理音频，无需服务端；
- 采用 worker 异步处理音频，不会阻塞页面 UI;
- 支持音频的裁剪、切割和拼接(当前仅支持 mp3 格式，后续将支持更多)；

## 安装

```
npm install audio-sculptor
```

## 快速开始

```javascript
import AudioSculptor from 'audio-sculptor';

const audioSculptor = new AudioSculptor();
const p1 = audioSculptor.open(workerPath);
p1.then(async () => {
  // 截取音频blob的第3s至第10s的内容，
  const clippedBlob = await audioSculptor.clip(yourBlob, 3, 10);
  // 将新生成的blob转换成音频，插入到页面
  const audio = new Audio(URL.createObjectURL(clippedBlob));
  audio.controls = true;
  document.body.appendChild(audio);
});
```

## API

##### audioSculptor.open(workerPath, onSuccess?, onFail?): Promise`<any>`

正式启动`audio-sculptor`，由于启动是异步的，需要通过回调函数或`Promise`控制后续的操作

- workerPath: `string`
  ffmpeg-worker 资源的路径地址，由于`audio-sculptor`是需要 worker 参与工作的，受限与 worker 的同源策略问题，开发者需要将`ffmpeg/ffmpeg-worker-mp4.js`资源单独部署到自己的项目中，保证 worker 资源路径与项目的同源；
- onSuccess: `Function`
  开启成功的回调函数
- onFail: `Function`
  开启失败的回调函数
- return: Promise
  返回一个`Promise`

##### audioSculptor.close(): void

关闭`audio-sculptor`，释放内存占用

##### audioSculptor.splice(originBlob, ss, es?, insertBlob?): Promise`<outputBlob>`

删减音频中间部分的内容，同时替换成给定的音频

- originBlob: `Blob`
  将被删减的原始音频

- ss: `number`
  指定被删区间的起始时间（单位：秒）

- es: `number`
  指定被删区间的结束时间（单位：秒），若不传，则默认删除到末尾

- insertBlob: `Blob`
  被替换的音频，若不传，则原始音频仅做删减处理

- outputBlob: `Blob`

  处理后的输出音频

##### audioSculptor.clip(originBlob, ss, es?): Promise`<outputBlob>`

截取音频中间部分的内容

- originBlob: `Blob`
  将被截取的原始音频

- ss: `number`
  指定被截取区间的起始时间（单位：秒）

- es: `number`
  指定被截取区间的结束时间（单位：秒），若不传，则默认截取到末尾

- outputBlob: `Blob`

  处理后的输出音频

##### audioSculptor.concat(blobs): Promise`<outputBlob>`

将多个音频首尾拼接成一个音频

- blobs: `Array<Blob>`
  将被拼接的音频数组
- outputBlob: `Blob`
  拼接后的音频
