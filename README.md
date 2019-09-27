# audio-sculptor

[![NPM](https://nodei.co/npm/ffmpeg.js.png?downloads=true)](https://www.npmjs.com/package/audio-sculptor)

`audio-sculptor`是一个支持在浏览器进行音频处理的库，支持音频裁剪、拼接、切割等操作。

## 特性

- 仅在浏览器环境即可处理音频，无需服务端；
- 采用 worker 异步处理音频，不会阻塞页面 UI;
- 支持音频的裁剪、切割和拼接(当前仅支持 mp3 格式，后续将支持更多)；

## 安装

```
npm install audio-sculptor
```

## 用法

可通过以下代码初始化`audio-sculptor`:

```javascript
import AudioSculptor from 'audio-sculptor';
const audioSculptor = new AudioSculptor();
```

`audio-sculptor`所操作的对象都是`Blob`而不是`Audio`，因此提供了以下静态方法进行相互转换:

### audioSculptor.toBlob(audio)

- `audio` <[Audio]>
- returns: <[Promise]<[Blob]>>

将 audio 转换成 blob

```javascript
const audio = new Audio(yourSrc);
audioSculptor.toBlob(audio).then(blob => {
  console.log('the audio transforms to blob: ', blob);
});
```

### audioSculptor.toAudio(blob)

- `blob` <[Blob]>
- returns: <[Promise]<[Audio]>>

```javascript
audioSculptor.toAudio(blob).then(audio => {
  console.log('the blob transforms to audio: ', audio);
});
```

将 blob 转成 audio

### audioSculptor.open(workerPath, [onSuccess], [onFail])

- `workerPath` <[string]> ffmpeg-worker 资源的路径地址，由于`audio-sculptor`是需要 worker 参与工作的，受限与 worker 的同源策略问题，开发者需要将`ffmpeg/ffmpeg-worker-mp4.js`资源单独部署到自己的项目中，保证 worker 资源路径与项目的同源，注意：`ffmpeg-worker-mp4.js`是引用了[https://github.com/Kagami/ffmpeg.js](https://github.com/Kagami/ffmpeg.js)的资源文件
- `onSuccess` <[Function]> 开启成功的回调函数
- `onFail` <[Function]<[Error]>> 开启失败的回调函数
- returns: <[Promise]>

正式启动`audio-sculptor`，由于启动是异步的，需要通过回调函数或`Promise`控制后续的操作

```javascript
const workerPath = 'http://localhost:9000/static/ffmpeg-worker-mp4.js';

const p1 = audioSculptor.open(workerPath);

p1.then(() => {
  console.log('open success!');
});
```

### audioSculptor.close()

关闭`audio-sculptor`，释放内存占用

### audioSculptor.splice(originBlob, ss, [es], [insertBlob])

- `originBlob` <[Blob]> 将被删减的原始音频
- `ss` <[number]> 指定被删区间的起始时间（单位：秒）
- `es` <[number]> 指定被删区间的结束时间（单位：秒），若不传，则默认删除到末尾
- `insertBlob` <[number]> 被替换的音频，若不传，则原始音频仅做删减处理
- returns: <[Promise]<[Blob]>> 处理后的输出音频

删减音频中间部分的内容，同时替换成给定的音频

```javascript
// 将音频audio1进行处理：将第3s至第7s的内容，替换成音频audio2
const audio1 = new Audio(yourSrc1);
const audio2 = new Audio(yourSrc2);

const blob1 = await audioSculptor.toBlob(audio1);
const blob2 = await audioSculptor.toBlob(audio2);

const blob3 = await audioSculptor.splice(blob1, 3, 7, blob2);
const audio3 = await audioSculptor.toAudio(blob3);
```

### audioSculptor.clip(originBlob, ss, [es])

- `originBlob` <[Blob]> 将被截取的原始音频
- `ss` <[number]> 指定被截取区间的起始时间（单位：秒）
- `es` <[number]> 指定被截取区间的结束时间（单位：秒），若不传，则默认截取到末尾
- returns: <[Promise]<[Blob]>> 处理后的输出音频

截取音频中间部分的内容

```javascript
// 提取音频audio的第3s至第7s
const audio = new Audio(yourSrc);
const blob = await audioSculptor.toBlob(audio);
const clippedBlob = await audioSculptor.clip(blob, 3, 7);
const clippedAudio = await audioSculptor.toAudio(clippedBlob);
```

### audioSculptor.concat(blobs)

- `blobs` <[Array]<[Blob]>> 将被拼接的音频数组
- returns: <[Promise]<[Blob]>> 拼接后的音频

将多个音频首尾拼接成一个音频

```javascript
const concatBlob = await audioSculptor.concat(blobs);
```
