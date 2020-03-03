import { ISdk, SdkConfig, MediaType } from './types';
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
} from './utils';
import { isNumber, get as getIn } from 'lodash';

export default class Sdk implements ISdk {
  private worker: Worker;
  private end: string = 'end';
  private timeoutNum: number;

  constructor(conf?: SdkConfig) {
    conf = conf || {};
    this.timeoutNum = conf.timeout || 30 * 1000;
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
  ): Promise<Blob> => {
    const ss = startSecond;
    const es = isNumber(endSecond) ? endSecond : this.end;

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
      rightSideArrBuf = (
        await pmToPromise(this.worker, getClipCommand(originAb, es as number))
      ).data.data.MEMFS[0].data;
    } else if (ss !== 0 && es === this.end) {
      // 裁剪至尾部
      leftSideArrBuf = (
        await pmToPromise(this.worker, getClipCommand(originAb, 0, ss))
      ).data.data.MEMFS[0].data;
    } else {
      // 局部裁剪
      leftSideArrBuf = (
        await pmToPromise(this.worker, getClipCommand(originAb, 0, ss))
      ).data.data.MEMFS[0].data;
      rightSideArrBuf = (
        await pmToPromise(this.worker, getClipCommand(originAb, es as number))
      ).data.data.MEMFS[0].data;
    }

    const arrBufs = [];
    leftSideArrBuf && arrBufs.push(leftSideArrBuf);
    insertBlob && arrBufs.push(await blobToArrayBuffer(insertBlob));
    rightSideArrBuf && arrBufs.push(rightSideArrBuf);

    const combindResult = await pmToPromise(
      this.worker,
      await getCombineCommand(arrBufs),
    );

    return audioBufferToBlob(combindResult.data.data.MEMFS[0].data);
  };

  splice = async (
    originBlob: Blob,
    startSecond: number,
    endSecond?: number,
    insertBlob?: Blob,
  ): Promise<Blob> => {
    return Promise.race([
      this.innerSplice(originBlob, startSecond, endSecond, insertBlob),
      timeout(this.timeoutNum) as any,
    ]);
  };

  convert = async (
    originBlob: Blob,
    targetType: MediaType,
    timeoutValue?: number,
    progressCallback?: (num: number) => void,
  ): Promise<Blob> => {
    return Promise.race([
      this.innerConvert(originBlob, targetType),
      timeout(timeoutValue || this.timeoutNum) as any,
    ]);
  };

  innerConvert = async (
    originBlob: Blob,
    originType: MediaType,
    progressCallback?: (num: number) => void,
  ): Promise<Blob> => {
    const originAb = await blobToArrayBuffer(originBlob);
    const result = await pmToPromiseWithProgress(
      this.worker,
      getConvertCommand(originAb, originType),
      progressCallback,
    );
    const resultArrBuf = getIn(result, 'data.data.MEMFS.0.data', null);
    return audioBufferToBlob(resultArrBuf);
  };

  innerTransformSelf = async (originBlob: Blob): Promise<Blob> => {
    const originAb = await blobToArrayBuffer(originBlob);
    const result = await pmToPromise(
      this.worker,
      getTransformSelfCommand(originAb),
    );
    const resultArrBuf = getIn(result, 'data.data.MEMFS.0.data', null);

    return audioBufferToBlob(resultArrBuf);
  };

  transformSelf = async (originBlob: Blob): Promise<Blob> => {
    return Promise.race([
      this.innerTransformSelf(originBlob),
      timeout(this.timeoutNum) as any,
    ]);
  };

  clip = async (
    originBlob: Blob,
    startSecond: number,
    endSecond?: number,
  ): Promise<Blob> => {
    return Promise.race([
      this.innerClip(originBlob, startSecond, endSecond),
      timeout(this.timeoutNum) as any,
    ]);
  };

  private innerClip = async (
    originBlob: Blob,
    startSecond: number,
    endSecond?: number,
  ): Promise<Blob> => {
    const ss = startSecond;
    const d = isNumber(endSecond) ? endSecond - startSecond : this.end;
    const originAb = await blobToArrayBuffer(originBlob);
    let resultArrBuf: ArrayBuffer;

    if (d === this.end) {
      resultArrBuf = (
        await pmToPromise(this.worker, getClipCommand(originAb, ss))
      ).data.data.MEMFS[0].data;
    } else {
      resultArrBuf = (
        await pmToPromise(
          this.worker,
          getClipCommand(originAb, ss, d as number),
        )
      ).data.data.MEMFS[0].data;
    }

    return audioBufferToBlob(resultArrBuf);
  };

  private innerConcat = async (blobs: Blob[]) => {
    const arrBufs: ArrayBuffer[] = [];

    for (let i = 0; i < blobs.length; i++) {
      arrBufs.push(await blobToArrayBuffer(blobs[i]));
    }

    const result = await pmToPromise(
      this.worker,
      await getCombineCommand(arrBufs),
    );
    return audioBufferToBlob(result.data.data.MEMFS[0].data);
  };

  concat = async (blobs: Blob[]) => {
    return Promise.race([this.innerConcat(blobs), timeout(this.timeoutNum)]);
  };

  toBlob(audio: HTMLAudioElement): Promise<Blob> {
    return audioToBlob(audio);
  }

  toAudio(blob: Blob): Promise<HTMLAudioElement> {
    return blobToAudio(blob);
  }
}
