import {
  IPostInfo,
  IWorkerEvent,
  MediaType,
  IProgressCallback,
  BlobMediaType,
} from './types';
import axios from 'axios';
import { get, isFunction } from 'lodash';

export function createWorker(workerPath: string) {
  const worker = new Worker(workerPath);
  return worker;
}

export function createTimeoutPromise(time: number): Promise<void> {
  return new Promise(resolve =>
    setTimeout(() => {
      resolve();
    }, time),
  );
}

export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = function() {
      resolve(fileReader.result as ArrayBuffer);
    };

    fileReader.onerror = function(evt) {
      const err1 = get(evt, 'target.error.code', 'NO CODE');
      const err2 = get(fileReader, 'error.code', 'NO CODE');

      reject(`fileReader read blob error: ${err1} or ${err2}`);
    };

    fileReader.readAsArrayBuffer(blob);
  });
}

export function pmToPromiseWithProgress(
  worker: Worker,
  postInfo?: IPostInfo,
  progressCallback?: IProgressCallback,
): Promise<{ buffer: ArrayBuffer; logs: string[] }> {
  let duration: number;
  let currentTime: number = 0;
  const durationReg = /Duration: (.+), start/;
  const currentTimeReg = /time=(.+) bitrate/;
  const result: { buffer: ArrayBuffer; logs: string[] } = {
    buffer: null,
    logs: [],
  };

  return new Promise((resolve, reject) => {
    const successHandler = function(event: IWorkerEvent) {
      result.logs.push(get(event, 'data.data', '').toString());

      switch (event.data.type) {
        case 'stdout':
        case 'stderr':
          const msg = get(event, 'data.data', '') as string;
          if (durationReg.test(msg)) {
            duration = timeToMillisecond(
              msg.match(durationReg)[1] || '00:00:01',
            );
          } else if (currentTimeReg.test(msg)) {
            currentTime = timeToMillisecond(
              msg.match(currentTimeReg)[1] || '00:00:00',
            );
          }

          const progress = currentTime / duration || 0;

          progressCallback &&
            progressCallback({
              progress: progress >= 0.999 ? 0.999 : progress,
              currentTime,
              duration,
            });
          console.log('worker stdout: ', event.data.data);
          break;

        case 'start':
          console.log('worker receive your command and start to work:)');
          break;

        case 'done':
          progressCallback &&
            progressCallback({ progress: 1, currentTime, duration });
          worker.removeEventListener('message', successHandler);
          result.buffer = get(event, 'data.data.MEMFS.0.data', null);
          resolve(result);
          break;

        case 'error':
          worker.removeEventListener('message', successHandler);
          reject(event.data.data);
          break;

        default:
          break;
      }
    };

    const failHandler = function(error: any) {
      worker.removeEventListener('error', failHandler);
      reject(error);
    };

    worker.addEventListener('message', successHandler);
    worker.addEventListener('error', failHandler);
    postInfo && worker.postMessage(postInfo);
  });
}

export function pmToPromise(
  worker: Worker,
  postInfo?: IPostInfo,
): Promise<{ buffer: ArrayBuffer; logs: string[] }> {
  const result = {
    buffer: null,
    logs: [],
  };

  return new Promise((resolve, reject) => {
    const successHandler = function(event: IWorkerEvent) {
      result.logs.push(get(event, 'data.data', '').toString());

      switch (event.data.type) {
        case 'stdout':
          // case 'stderr':
          console.log('worker stdout: ', event.data.data);
          break;

        case 'start':
          console.log('worker receive your command and start to work:)');
          break;

        case 'done':
          worker.removeEventListener('message', successHandler);
          result.buffer = get(event, 'data.data.MEMFS.0.data', null);
          resolve(result);
          break;

        case 'error':
          worker.removeEventListener('message', successHandler);
          reject(event.data.data);
          break;

        default:
          break;
      }
    };

    const failHandler = function(error: any) {
      worker.removeEventListener('error', failHandler);
      reject(error);
    };
    worker.addEventListener('message', successHandler);
    worker.addEventListener('error', failHandler);
    postInfo && worker.postMessage(postInfo);
  });
}

export function waitForWorkerIsReady(
  worker: Worker,
  onSuccess?: Function,
  onFail?: Function,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleReady = function(event: IWorkerEvent) {
      if (event.data.type === 'ready') {
        worker.removeEventListener('message', handleReady);
        onSuccess && onSuccess();
        resolve();
      }
    };
    const handleError = (err: any) => {
      worker.removeEventListener('error', handleError);
      onFail && onFail(err);
      reject(err);
    };
    worker.addEventListener('message', handleReady);
    worker.addEventListener('error', handleError);
  });
}

export function getClipCommand(
  arrayBuffer: ArrayBuffer,
  st: number,
  et?: number,
) {
  const type = getMediaType();
  return {
    type: 'run',
    arguments: `-ss ${st} -i input.${type} ${
      et ? `-t ${et} ` : ''
    }-acodec copy output.${type}`.split(' '),
    MEMFS: [
      {
        data: new Uint8Array(arrayBuffer as any),
        name: `input.${type}`,
      },
    ],
  };
}

export function getTransformSelfCommand(arrayBuffer: ArrayBuffer) {
  const type = getMediaType();
  return {
    type: 'run',
    arguments: `-i input.${type} -vcodec copy -acodec copy output.${type}`.split(
      ' ',
    ),
    MEMFS: [
      {
        data: new Uint8Array(arrayBuffer as any),
        name: `input.${type}`,
      },
    ],
  };
}

export function getConvertCommand(
  arrayBuffer: ArrayBuffer,
  originType: MediaType,
) {
  const type = getMediaType();
  return {
    type: 'run',
    arguments: `-i input.${originType} -vn -y output.${type}`.split(' '),
    MEMFS: [
      {
        data: new Uint8Array(arrayBuffer as any),
        name: `input.${originType}`,
      },
    ],
  };
}

export function getClipConvertCommand(
  arrayBuffer: ArrayBuffer,
  originType: MediaType,
  st: number,
  et?: number,
) {
  const type = getMediaType();
  return {
    type: 'run',
    arguments: `-ss ${st} -i input.${originType} ${
      et ? `-t ${et} ` : ''
    }-y output.${type}`.split(' '),
    MEMFS: [
      {
        data: new Uint8Array(arrayBuffer as any),
        name: `input.${originType}`,
      },
    ],
  };
}

export async function getCombineCommand(audioBuffers: ArrayBuffer[]) {
  const type = getMediaType();
  const files = audioBuffers.map((arrayBuffer, index) => ({
    data: new Uint8Array(arrayBuffer as any),
    name: `input${index}.${type}`,
  }));
  const txtContent = [files.map(f => `file '${f.name}'`).join('\n')];
  const txtBlob = new Blob(txtContent, { type: 'text/txt' });
  const fileArrayBuffer = await blobToArrayBuffer(txtBlob);
  files.push({
    data: new Uint8Array(fileArrayBuffer),
    name: 'filelist.txt',
  });

  return {
    type: 'run',
    arguments: `-f concat -i filelist.txt -c copy output.${type}`.split(' '),
    MEMFS: files,
  };
}

export function audioBufferToBlob(arrayBuffer: any) {
  const type = getMediaType();
  const blob = new Blob([arrayBuffer], { type: toBlobMediaType(type) });
  return blob;
}

export async function blobToAudio(blob: Blob): Promise<HTMLAudioElement> {
  const url = URL.createObjectURL(blob);
  return Promise.resolve(new Audio(url));
}

export async function audioToBlob(audio: HTMLAudioElement): Promise<Blob> {
  const url = audio.src;
  if (url) {
    return axios({
      url,
      method: 'get',
      responseType: 'arraybuffer',
    }).then(async res => {
      const arrayBuffer = res.data;
      const contentType = res.headers['content-type'];
      const file = new File([arrayBuffer], 'result', {
        type: contentType,
      });

      return file;
    });
  } else {
    return Promise.resolve(null);
  }
}

export function timeout(time: number): Promise<any> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('timeout in audioSculptor!')), time);
  });
}

/**
 * 判断是否为一个audio对象
 * @param audio
 */
export function isAudio(audio: any): boolean {
  return (
    audio &&
    isFunction(audio.play) &&
    isFunction(audio.pause) &&
    isFunction(audio.canPlayType)
  );
}

let mediaType: MediaType;
export function setMediaType(type: MediaType) {
  mediaType = type;
}

export function getMediaType(): MediaType {
  return mediaType;
}

// "00:30:00.47"
function timeToMillisecond(time: string) {
  const [hour, minute, second] = time.split(':').map(str => parseFloat(str));
  let millisecond = 0;
  millisecond += second * 1000;
  millisecond += minute * 60 * 1000;
  millisecond += hour * 60 * 60 * 1000;
  return millisecond;
}

function toBlobMediaType(mediaType: MediaType): BlobMediaType {
  return BlobMediaType[mediaType];
}
