# audio-sculptor API

该文档使用类 typescript 风格定义接口与类型

## 目录

Initial:

- [new AudioSculptor()](#new-audiosculptor)

Functions:

- [audioSculptor.toBlob()](#audiosculptortoblob)
- [audioSculptor.toAudio()](#audiosculptortoaudio)
- [audioSculptor.open()](#audiosculptoropen)
- [audioSculptor.close()](#audiosculptorclose)
- [audioSculptor.splice()](#audiosculptorsplice)
- [audioSculptor.clip()](#audiosculptorclip)
- [audioSculptor.concat()](#audiosculptorconcat)
- [audioSculptor.custom()](#audiosculptorcustom)

## Initial

### new AudioSculptor()

```javascript
const audioSculptor = new AudioSculptor({
  timeout: 20 * 1000, // 将超时设置为20s
});
```

初始化 audio-sculptor，通过传入配置项，可配置一些基本内容

| Field   | Type   | necessity | Description                                  |
| ------- | ------ | --------- | -------------------------------------------- |
| timeout | number | 否        | 音频处理的默认超时时间，单位毫秒，默认为 30s |

## Functions

### audioSculptor.toBlob()

```typescript
function toBlob(audio: HTMLAudioElement): Promise<Blob>;
```

audio-sculptor 所操作的对象都是 Blob 而不是 audio DOM 对象，因此提供了一些方法进行相互转换，上述将 audio DOM 对象转为 blob 格式

```javascript
const audio = new Audio(yourSrc);
audioSculptor.toBlob(audio).then((blob) => {
  console.log('the audio transforms to blob: ', blob);
});
```

### audioSculptor.toAudio()

```typescript
function toAudio(blob: Blob): Promise<HTMLAudioElement>;
```

将 blob 转成 audio

### audioSculptor.open()

```typescript
function open(conf: Config): Promise<any>;
```

正式启动 audio-sculptor，在开始任何工作前，必须先执行此方法。由于启动是异步的，需要通过回调函数或 Promise 控制后续的操作

**Config** 配置如下

| Field      | Type      | necessity | Description                                                                                                                                                                                                                                                                                                                               |
| ---------- | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| workerPath | string    | 是        | ffmpeg-worker 资源的路径地址，由于 audio-sculptor 是需要 worker 参与工作的，受限于 worker 的同源策略问题，开发者需要将`ffmpeg/ffmpeg-worker-mp4.js`资源单独部署到自己的项目中，保证 worker 资源路径与项目的同源，注意：`ffmpeg-worker-mp4.js`是引用了[https://github.com/Kagami/ffmpeg.js](https://github.com/Kagami/ffmpeg.js)的资源文件 |
| mediaType  | MediaType | 是        | 默认的音频输出格式，可枚举值                                                                                                                                                                                                                                                                                                              |
| onSuccess  | Function  | 否        | 开启成功回调                                                                                                                                                                                                                                                                                                                              |
| onFail     | Function  | 否        | 开启失败回调                                                                                                                                                                                                                                                                                                                              |

**MediaType**

```typescript
enum MediaType {
  mp3 = 'mp3',
  webm = 'webm',
}
```

### audioSculptor.close()

```typescript
function close(): void;
```

关闭 audio-sculptor，释放内存占用

### audioSculptor.splice()

```typescript
function splice(
  originBlob: Blob,
  startSecond: number,
  endSecond?: number,
  insertBlob?: Blob,
): Promise<IOutput>;
```

删减音频中间部分的内容，同时替换成给定的音频（可选）

| Field       | Type   | Description                                                  |
| ----------- | ------ | ------------------------------------------------------------ |
| originBlob  | Blob   | 原始音频 blob                                                |
| startSecond | number | 指定被删区间的起始时间（单位：秒）                           |
| endSecond   | number | 指定被删区间的结束时间（单位：秒），若不传，则默认删除到末尾 |
| insertBlob  | Blob   | 被替换的音频，若不传，则原始音频仅做删减处理                 |

**IOutput**

| Field | Type                   | Description   |
| ----- | ---------------------- | ------------- |
| blob  | Blob                   | 输出音频 Blob |
| logs  | `Array<Array<string>>` | log 信息      |

```javascript
// 将音频audio1进行处理：将第3s至第7s的内容，替换成音频audio2
const audio1 = new Audio(yourSrc1);
const audio2 = new Audio(yourSrc2);

const blob1 = await audioSculptor.toBlob(audio1);
const blob2 = await audioSculptor.toBlob(audio2);

const { blob: blob3, logs } = await audioSculptor.splice(blob1, 3, 7, blob2);
const audio3 = await audioSculptor.toAudio(blob3);
console.log(logs);
// the infomation about how worker work during the audio processing
```

_注意：在接下来的有关音频操作的方法，其返回值均为 `Pormise<IOutput>`_

### audioSculptor.clip()

```typescript
function clip(
  originBlob: Blob,
  startSecond: number,
  endSecond?: number,
): Promise<IOutput>;
```

截取音频中间部分的内容
| Field | Type | Description |
| ----------- | ------ | ------------------------------- |
| originBlob | Blob | 原始音频 blob |
| startSecond | number | 指定被截取区间的起始时间（单位：秒） |
| endSecond | number | 指定被截取区间的结束时间（单位：秒），若不传，则默认截取到末尾 |

```javascript
// 提取音频audio的第3s至第7s
const audio = new Audio(yourSrc);
const blob = await audioSculptor.toBlob(audio);
const { blob: clippedBlob } = await audioSculptor.clip(blob, 3, 7);
const clippedAudio = await audioSculptor.toAudio(clippedBlob);
```

### audioSculptor.concat()

```typescript
function concat(blobs: Blob[]): Promise<IOutput>;
```

将多个音频首尾拼接成一个音频

```javascript
const { blob: concatBlob } = await audioSculptor.concat(blobs);
```

### audioSculptor.custom()

```typescript
function custom(config: ICustomConfig): Promise<IOutput>;
```

由于 ffmpeg 包含的音频处理操作类型繁多，为了在使用层面提高 audio-sculptor 的拓展性，提供了 custom 方法，用于自定义音频处理，audio-sculptor 将根据给定的 commandLine 执行开发者预期的操作，如下所示，可借助 custom 实现音频从 webm 转 mp3 的转码操作

**ICustomConfig**

| Field       | Type    | necessity | Description   |
| ----------- | ------- | --------- | ------------- |
| commandLine | string  | 是        | ffmpeg 命令行 |
| audios      | IAudios | 是        | 输入音频文件  |
| timeout     | number  | 否        | 超时时长      |

**IAudios**

```typescript
interface IAudios {
  [name: string]: ArrayBuffer | Blob | HTMLAudioElement;
}
```

```typescript
const { blob } = audioSculptor.custom({
  audios: {
    'input.webm': yourBlob,
  },
  timeout: 60 * 60 * 1000,
  commandLine: `-i input.webm -ar 16000 output.mp3`,
});
```
