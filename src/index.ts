import { ISdk, SdkConfig } from './types';
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
} from './utils';
import { isNumber } from 'lodash';

export default class Sdk implements ISdk {
  private worker: Worker;
  private end: string = 'end';
  private timeoutNum: number;

  constructor(conf?: SdkConfig) {
    const { timeout = 30 * 1000 } = conf || {};
    this.timeoutNum = timeout;
  }

  open = (
    workerPath: string,
    onSuccess?: Function,
    onFail?: Function,
  ): Promise<any> => {
    const worker = createWorker(workerPath);
    const p1 = waitForWorkerIsReady(worker, onSuccess, onFail);
    const p2 = createTimeoutPromise(30 * 1000);
    this.worker = worker;
    return Promise.race([p1, p2]);
  };

  close = () => {
    this.worker.terminate();
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
