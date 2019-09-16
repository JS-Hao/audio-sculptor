import './recorder';
import AudioSculptor from 'audio-sculptor';

const r = new Recorder({});
const a = new AudioSculptor();

const p = a.open('http://localhost:9000/static/ffmpeg-worker-mp4.js');

r.open(() => {
  r.start();

  setTimeout(() => {
    r.stop(blob1 => {
      setTimeout(() => {
        r.start();
        setTimeout(() => {
          r.stop(
            blob2 => {
              p.then(() => {
                a.splice(blob1, 2, 3, blob2).then(blob => {
                  const url = URL.createObjectURL(blob);
                  const audio = new Audio(url);
                  audio.controls = true;
                  document.body.appendChild(audio);

                  a.clip(blob, 1, 3).then(b => {
                    const url = URL.createObjectURL(b);
                    const audio = new Audio(url);
                    audio.controls = true;
                    document.body.appendChild(audio);
                  });
                });
              });
            },
            err => console.error(err),
          );
        }, 2000);
      }, 1000);
      // p.then(() => {
      //   a.clip(blob1, 1, 2).then(blob => {
      //     const url = URL.createObjectURL(blob);
      //     const audio = new Audio(url);
      //     audio.controls = true;
      //     document.body.appendChild(audio);
      //   });
      // });
    });
  }, 3000);
});
