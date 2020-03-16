export interface WorkerEvent {
  data: {
    type: string;
    data: {
      MEMFS: { data: ArrayBuffer }[];
    };
  };
}

export interface SdkConfig {
  timeout?: number;
}

export enum MediaType {
  mp3 = 'mp3',
  webm = 'webm',
}

export interface ISdk {
  open(conf: {
    workerPath: string;
    mediaType: MediaType;
    onSuccess?: Function;
    onFail?: Function;
  }): Promise<any>;

  close(): void;

  splice(
    originBlob: Blob,
    startSecond: number,
    endSecond: number,
    insertBlob?: Blob,
  ): Promise<Blob>;

  transformSelf(originBlob: Blob): Promise<Blob>;

  clip(originBlob: Blob, startSecond: number, endSecond: number): Promise<Blob>;

  toBlob(audio: HTMLAudioElement): Promise<Blob>;

  toAudio(blob: Blob): Promise<HTMLAudioElement>;
}

export interface PostInfo {
  type: string;
  arguments: string[];
  MEMFS: any[];
}

export interface ProgressCallback {
  (params: { progress: number; duration: number; currentTime: number }): void;
}
