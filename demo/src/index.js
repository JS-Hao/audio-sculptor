import './recorder';
import AudioSculptor from 'audio-sculptor';

main();

async function main() {
  const audioSculptor = new AudioSculptor();

  // 启动audioSculptor
  const p = await audioSculptor.open('/static/ffmpeg-worker-mp4.js');

  // 创建一个音频
  const audio = document.querySelector('audio');

  const blob = await audioSculptor.toBlob(audio);

  // 裁剪第5至10秒
  const clippedBlob = await audioSculptor.clip(blob, 5, 10);
  const clippedAudio = await audioSculptor.toAudio(clippedBlob);

  const span = document.querySelector('.span');
  span.innerText = '处理后的音频: ';
  clippedAudio.controls = true;
  document.body.appendChild(clippedAudio);
}
