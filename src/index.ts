import {
  ISdk,
  ISdkConfig,
  IProgressCallback,
  ICustomConfig,
  IOutput,
  MediaType,
} from './types';
import {
  createWorker,
  createTimeoutPromise,
  blobToArrayBuffer,
  waitForWorkerIsReady,
  pmToPromise,
  getCombineCommand,
  getClipCommand,
  audioBufferToBlob,
  blobToAudio,
  audioToBlob,
  timeout,
  setMediaType,
  getTransformSelfCommand,
  getConvertCommand,
  pmToPromiseWithProgress,
  getClipConvertCommand,
  isAudio,
} from './utils';
import { isNumber, flatten } from 'lodash';
import * as types from './types';

export default class Sdk implements ISdk {
  private worker: Worker;
  private end: string = 'end';
  private defaultTimeout: number;

  constructor(conf?: ISdkConfig) {
    conf = conf || {};
    this.defaultTimeout = conf.timeout || 30 * 1000;
  }

  open = (conf: {
    workerPath: string;
    mediaType: MediaType;
    onSuccess?: Function;
    onFail?: Function;
  }): Promise<any> => {
    const { workerPath, mediaType, onSuccess, onFail } = conf;
    setMediaType(mediaType);
    const worker = createWorker(workerPath);
    const p1 = waitForWorkerIsReady(worker, onSuccess, onFail);
    const p2 = createTimeoutPromise(30 * 1000);
    this.worker = worker;
    return Promise.race([p1, p2]);
  };

  close = () => {
    this.worker.terminate();
    this.worker = null;
  };

  private innerSplice = async (
    originBlob: Blob,
    startSecond: number,
    endSecond?: number,
    insertBlob?: Blob,
  ): Promise<IOutput> => {
    const ss = startSecond;
    const es = isNumber(endSecond) ? endSecond : this.end;
    const logs: string[][] = [];

    insertBlob = insertBlob
      ? insertBlob
      : endSecond && !isNumber(endSecond)
      ? endSecond
      : null;

    const originAb = await blobToArrayBuffer(originBlob);
    let leftSideArrBuf: ArrayBuffer;
    let rightSideArrBuf: ArrayBuffer;

    if (ss === 0 && es === this.end) {
      // 裁剪全部
      return null;
    } else if (ss === 0) {
      // 从头开始裁剪
      const result = await pmToPromise(
        this.worker,
        getClipCommand(originAb, es as number),
      );
      rightSideArrBuf = result.buffer;
      logs.push(result.logs);
    } else if (ss !== 0 && es === this.end) {
      // 裁剪至尾部
      const result = await pmToPromise(
        this.worker,
        getClipCommand(originAb, 0, ss),
      );
      leftSideArrBuf = result.buffer;
      logs.push(result.logs);
    } else {
      // 局部裁剪
      const result1 = await pmToPromise(
        this.worker,
        getClipCommand(originAb, 0, ss),
      );
      leftSideArrBuf = result1.buffer;
      logs.push(result1.logs);

      const result2 = await pmToPromise(
        this.worker,
        getClipCommand(originAb, es as number),
      );
      rightSideArrBuf = result2.buffer;
      logs.push(result2.logs);
    }

    const arrBufs = [];
    leftSideArrBuf && arrBufs.push(leftSideArrBuf);
    insertBlob && arrBufs.push(await blobToArrayBuffer(insertBlob));
    rightSideArrBuf && arrBufs.push(rightSideArrBuf);

    const combindResult = await pmToPromise(
      this.worker,
      await getCombineCommand(arrBufs),
    );

    logs.push(combindResult.logs);

    return {
      blob: audioBufferToBlob(combindResult.buffer),
      logs,
    };
  };

  splice = async (
    originBlob: Blob,
    startSecond: number,
    endSecond?: number,
    insertBlob?: Blob,
  ): Promise<IOutput> => {
    return Promise.race([
      this.innerSplice(originBlob, startSecond, endSecond, insertBlob),
      timeout(this.defaultTimeout),
    ]);
  };

  convert = async (
    originBlob: Blob,
    targetType: MediaType,
    timeoutValue?: number,
    progressCallback?: IProgressCallback,
  ): Promise<IOutput> => {
    return Promise.race([
      this.innerConvert(originBlob, targetType, progressCallback),
      timeout(timeoutValue || this.defaultTimeout),
    ]);
  };

  innerConvert = async (
    originBlob: Blob,
    originType: MediaType,
    progressCallback?: IProgressCallback,
  ): Promise<IOutput> => {
    const originAb = await blobToArrayBuffer(originBlob);
    const result = await pmToPromiseWithProgress(
      this.worker,
      getConvertCommand(originAb, originType),
      progressCallback,
    );
    const resultArrBuf = result.buffer;
    return {
      blob: audioBufferToBlob(resultArrBuf),
      logs: [result.logs],
    };
  };

  innerTransformSelf = async (originBlob: Blob): Promise<IOutput> => {
    const originAb = await blobToArrayBuffer(originBlob);
    const result = await pmToPromise(
      this.worker,
      getTransformSelfCommand(originAb),
    );
    const resultArrBuf = result.buffer;

    return {
      blob: audioBufferToBlob(resultArrBuf),
      logs: [result.logs],
    };
  };

  transformSelf = async (originBlob: Blob): Promise<IOutput> => {
    return Promise.race([
      this.innerTransformSelf(originBlob),
      timeout(this.defaultTimeout),
    ]);
  };

  clip = async (
    originBlob: Blob,
    startSecond: number,
    endSecond?: number,
  ): Promise<IOutput> => {
    return Promise.race([
      this.innerClip(originBlob, startSecond, endSecond),
      timeout(this.defaultTimeout),
    ]);
  };

  private innerClip = async (
    originBlob: Blob,
    startSecond: number,
    endSecond?: number,
  ): Promise<IOutput> => {
    const ss = startSecond;
    const d = isNumber(endSecond) ? endSecond - startSecond : this.end;
    const originAb = await blobToArrayBuffer(originBlob);
    const logs = [];
    let resultArrBuf: ArrayBuffer;

    if (d === this.end) {
      const result = await pmToPromise(
        this.worker,
        getClipCommand(originAb, ss),
      );
      resultArrBuf = result.buffer;
      logs.push(result.logs);
    } else {
      const result = await pmToPromise(
        this.worker,
        getClipCommand(originAb, ss, d as number),
      );
      resultArrBuf = result.buffer;
      logs.push(logs);
    }

    return {
      blob: audioBufferToBlob(resultArrBuf),
      logs,
    };
  };

  private innerConcat = async (blobs: Blob[]): Promise<IOutput> => {
    const arrBufs: ArrayBuffer[] = [];

    for (let i = 0; i < blobs.length; i++) {
      arrBufs.push(await blobToArrayBuffer(blobs[i]));
    }

    const result = await pmToPromise(
      this.worker,
      await getCombineCommand(arrBufs),
    );

    const concatBlob = audioBufferToBlob(result.buffer);
    return {
      blob: concatBlob,
      logs: [result.logs],
    };
  };

  clipConvert = async (
    arrayBuffer: ArrayBuffer,
    originType: MediaType,
    startSecond: number,
    endSecond?: number,
    progressCallback?: IProgressCallback,
  ): Promise<IOutput> => {
    return Promise.race([
      this.innerClipConvert(
        arrayBuffer,
        originType,
        startSecond,
        endSecond,
        progressCallback,
      ),
      timeout(this.defaultTimeout) as any,
    ]);
  };

  private innerClipConvert = async (
    arrayBuffer: ArrayBuffer,
    originType: MediaType,
    startSecond: number,
    endSecond?: number,
    progressCallback?: IProgressCallback,
  ): Promise<IOutput> => {
    const result = await pmToPromiseWithProgress(
      this.worker,
      getClipConvertCommand(arrayBuffer, originType, startSecond, endSecond),
      progressCallback,
    );
    const resultArrBuf = result.buffer;
    return {
      blob: audioBufferToBlob(resultArrBuf),
      logs: [result.logs],
    };
  };

  concat = async (blobs: Blob[]): Promise<IOutput> => {
    return Promise.race([
      this.innerConcat(blobs),
      timeout(this.defaultTimeout),
    ]);
  };

  toBlob(audio: HTMLAudioElement): Promise<Blob> {
    return audioToBlob(audio);
  }

  toAudio(blob: Blob): Promise<HTMLAudioElement> {
    return blobToAudio(blob);
  }

  custom(config: ICustomConfig): Promise<IOutput> {
    const { timeout: inputTimeout } = config;
    return Promise.race([
      this.innerCustom(config),
      timeout(inputTimeout || this.defaultTimeout),
    ]);
  }

  private async innerCustom(config: ICustomConfig): Promise<IOutput> {
    const { commandLine, audios, processCallback } = config;
    const MEMFS = [];
    const audioNames = Object.keys(audios);
    for (let index = 0; index < audioNames.length; index++) {
      const name = audioNames[index];
      const audio = audios[name];
      let blob: Blob;

      if (isAudio(audio)) {
        blob = await audioToBlob(audio as HTMLAudioElement);
      } else {
        blob = audio as Blob;
      }

      MEMFS.push({
        name,
        data: new Uint8Array(await blobToArrayBuffer(blob)),
      });
    }

    const result = await pmToPromiseWithProgress(
      this.worker,
      {
        type: 'run',
        arguments: commandLine.split(' '),
        MEMFS,
      },
      processCallback,
    );

    return {
      blob: audioBufferToBlob(result.buffer),
      logs: [result.logs],
    };
  }
}

export { types };
