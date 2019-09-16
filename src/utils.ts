import { PostInfo, WorkerEvent } from './types';

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
  return {
    type: 'run',
    arguments: `-ss ${st} -i input.mp3 ${
      et ? `-t ${et} ` : ''
    }-acodec copy output.mp3`.split(' '),
    MEMFS: [
      {
        data: new Uint8Array(arrayBuffer as any),
        name: 'input.mp3',
      },
    ],
  };
}

export async function getCombineCommand(audioBuffers: ArrayBuffer[]) {
  const files = audioBuffers.map((arrayBuffer, index) => ({
    data: new Uint8Array(arrayBuffer as any),
    name: `input${index}.mp3`,
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
    arguments: `-f concat -i filelist.txt -c copy output.mp3`.split(' '),
    MEMFS: files,
  };
}

export function audioBufferToBlob(arrayBuffer: any) {
  const file = new File([arrayBuffer], 'test.mp3', {
    type: 'audio/mp3',
  });
  return file;
}

function toTwoDigits(time: number | string): string {
  const timeStr = time.toString();
  return parseInt(timeStr) <= 9 ? `0${timeStr}` : timeStr;
}
