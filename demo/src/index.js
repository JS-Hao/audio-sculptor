import './recorder';
import AudioSculptor from 'audio-sculptor';

const r = new Recorder({});
const a = new AudioSculptor();

const p = a.open('http://localhost:9000/static/ffmpeg-worker-mp4.js');

r.open(async () => {
  r.start();
  const url = 'http://thisUrlIsFake.useYourSelf.mp3';
  const audio = new Audio(url);

  await p;
  const blob = await a.toBlob(audio);
  const clippedBlob = await a.clip(blob, 0, 3.058);
  const clippedAudio = await a.toAudio(clippedBlob);
  window.clippedAudio = clippedAudio;
  clippedAudio.controls = true;
  document.body.appendChild(clippedAudio);
});
