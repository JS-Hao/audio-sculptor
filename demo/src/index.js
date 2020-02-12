import './recorder';
import AudioSculptor from 'audio-sculptor';

main();

async function main() {
  const audioSculptor = new AudioSculptor();

  // 启动audioSculptor
  const p = await audioSculptor.open({
    workerPath: '/static/ffmpeg-worker-mp4.js',
    mediaType: 'mp3',
  });

  // 创建一个音频
  const audio = document.querySelector('audio');

  const blob = await audioSculptor.toBlob(audio);

  // const arrayBuffer = await blobToArrayBuffer(blob);
  // const audioContext = new AudioContext();
  // const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  // const duration = parseFloat(audioBuffer.duration.toFixed(3)) * 1000;
  // audioContext.close();

  // 裁剪第5至50秒
  const beginTime = Date.now();
  const clippedBlob = await audioSculptor.splice(blob, 60 * 60, 60 * 70);
  const endTime = Date.now();
  const clippedAudio = await audioSculptor.toAudio(clippedBlob);

  const span = document.querySelector('.span');
  span.innerText = '处理后的音频: ';
  clippedAudio.controls = true;
  document.body.appendChild(clippedAudio);
  const h1 = document.createElement('h1');
  h1.innerText = endTime - beginTime;
  document.body.appendChild(h1);
}

function blobToArrayBuffer(blob) {
  return new Promise(resolve => {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      resolve(fileReader.result);
    };
    fileReader.readAsArrayBuffer(blob);
  });
}
