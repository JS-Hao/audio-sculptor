export interface WorkerEvent {
  data: {
    type: string;
    data: {
      MEMFS: { data: ArrayBuffer }[];
    };
  };
}

export interface ISdk {
  open(
    workerPath: string,
    onSuccess?: Function,
    onFail?: Function,
  ): Promise<any>;

  close(): void;

  splice(
    originBlob: Blob,
    startSecond: number,
    endSecond: number,
    insertBlob?: Blob,
  ): Promise<Blob>;

  clip(originBlob: Blob, startSecond: number, endSecond: number): Promise<Blob>;

  toBlob(audio: HTMLAudioElement): Promise<Blob>;

  toAudio(blob: Blob): Promise<HTMLAudioElement>;
}

export interface PostInfo {
  type: string;
  arguments: string[];
  MEMFS: any[];
}
