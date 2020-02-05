import { PostInfo, WorkerEvent, MediaType } from './types';
import axios from 'axios';

export function createWorker(workerPath: string) {
  // const blob = URL.createObjectURL(
  //   new Blob(
  //     [
  //       'importScripts("' +
  //         workerPath +
  //         '");var now = Date.now;function print(text) {postMessage({"type" : "stdout","data" : text});};onmessage = function(event) {var message = event.data;if (message.type === "command") {var Module = {print: print,printErr: print,files: message.files || [],arguments: message.arguments || [],TOTAL_MEMORY: message.TOTAL_MEMORY || false};postMessage({"type" : "start","data" : Module.arguments.join(" ")});postMessage({"type" : "stdout","data" : "Received command: " +Module.arguments.join(" ") +((Module.TOTAL_MEMORY) ? ".  Processing with " + Module.TOTAL_MEMORY + " bits." : "")});var time = now();var result = ffmpeg_run(Module);var totalTime = now() - time;postMessage({"type" : "stdout","data" : "Finished processing (took " + totalTime + "ms)"});postMessage({"type" : "done","data" : result,"time" : totalTime});}};postMessage({"type" : "ready"});',
  //     ],
  //     {
  //       type: 'application/javascript',
  //     },
  //   ),
  // );

  // const worker = new Worker(blob);
  // URL.revokeObjectURL(blob);
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
  return new Promise(resolve => {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      resolve(fileReader.result as ArrayBuffer);
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

export function pmToPromise(
  worker: Worker,
  postInfo?: PostInfo,
): Promise<WorkerEvent> {
  return new Promise((resolve, reject) => {
    const successHandler = function(event: WorkerEvent) {
      switch (event.data.type) {
        case 'stdout':
          console.log('worker stdout: ', event.data.data);
          break;

        case 'start':
          console.log('worker receive your command and start to work:)');
          break;

        case 'done':
          worker.removeEventListener('message', successHandler);
          resolve(event);
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
    const handleReady = function(event: WorkerEvent) {
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
  const file = new File([arrayBuffer], `test.${type}`, {
    type: `audio/${type}`,
  });
  return file;
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

export function timeout(time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('timeout in audioSculptor!')), time);
  });
}

let mediaType: MediaType;
export function setMediaType(type: MediaType) {
  mediaType = type;
}

export function getMediaType(): MediaType {
  return mediaType;
}
