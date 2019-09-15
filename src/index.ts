import { ISdk } from './types';
import { workerPath } from './constant';
import {
  createWorker,
  createTimeoutPromise,
  blobToArrayBuffer,
  waitForWorkerIsReady,
  pmToPromise,
  getCombineCommand,
  getClipCommand,
  audioBufferToBlob,
} from './utils';

export default class Sdk implements ISdk {
  private worker: Worker;

  open = (onSuccess?: Function, onFail?: Function): Promise<any> => {
    const worker = createWorker(workerPath);
    const p1 = waitForWorkerIsReady(worker, onSuccess, onFail);
    const p2 = createTimeoutPromise(30 * 1000);
    this.worker = worker;
    return Promise.race([p1, p2]);
  };

  close = () => {
    this.worker.terminate();
  };

  splice = async (
    originBlob: Blob,
    startSecond: number,
    endSecond: number,
    insertBlob?: Blob,
  ): Promise<Blob> => {
    const st = startSecond;
    const et = endSecond;
    const originAb = await blobToArrayBuffer(originBlob);
    const leftSideResult = await pmToPromise(
      this.worker,
      getClipCommand(originAb, 0, st),
    );
    const rightSideResult = await pmToPromise(
      this.worker,
      getClipCommand(originAb, et),
    );

    const leftSideAb = leftSideResult.data.data[0].data;
    const rightSideAb = rightSideResult.data.data[0].data;
    const combindResult = await pmToPromise(
      this.worker,
      await getCombineCommand(
        insertBlob
          ? [leftSideAb, await blobToArrayBuffer(insertBlob), rightSideAb]
          : [leftSideAb, rightSideAb],
      ),
    );
    return audioBufferToBlob(combindResult.data.data[0].data);
  };

  clip = async (
    originBlob: Blob,
    startSecond: number,
    endSecond: number,
  ): Promise<Blob> => {
    const st = startSecond;
    const et = endSecond - startSecond;
    const originAb = await blobToArrayBuffer(originBlob);
    const result = await pmToPromise(
      this.worker,
      getClipCommand(originAb, st, et),
    );
    return audioBufferToBlob(result.data.data[0].data);
  };
}
