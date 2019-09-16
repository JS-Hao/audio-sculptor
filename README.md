# audio-sculptor

`audio-sculptor`是一个支持在浏览器进行音频处理的库，支持音频裁剪、拼接、切割等操作。



## 特性

* 仅在浏览器环境即可处理音频，无需服务端；
* 采用worker异步处理音频，不会阻塞页面UI;
* 支持音频的裁剪、切割和拼接(当前仅支持mp3格式，后续将支持更多)；



## 安装

```
npm install audio-sculptor
```



## 快速开始

```javascript
import AudioSculptor from 'audio-sculptor';

const audioSculptor = new AudioSculptor();
const p1 = audioSculptor.open(workerPath)
p1.then(async () => {
    // 截取音频blob的第3s至第10s的内容，
	const clippedBlob = await audioSculptor.clip(yourBlob, 3, 10);
})
```

