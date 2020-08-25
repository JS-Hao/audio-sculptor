export interface IWorkerEvent {
  data: {
    type: string;
    data: {
      MEMFS: { data: ArrayBuffer }[];
    };
  };
}

export interface ISdkConfig {
  timeout?: number;
}

export enum MediaType {
  mp3 = 'mp3',
  webm = 'webm',
}

export enum BlobMediaType {
  mp3 = 'audio/mpeg',
  webm = 'audio/webm',
}

export interface ICustomConfig {
  commandLine: string;
  progressCallback?: IProgressCallback;
  timeout?: number;
  audios: {
    [name: string]: ArrayBuffer | Blob | HTMLAudioElement;
  };
}

export interface IOutput {
  blob: Blob;
  logs: Array<Array<string>>;
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
    endSecond?: number,
    insertBlob?: Blob,
  ): Promise<IOutput>;

  transformSelf(originBlob: Blob): Promise<IOutput>;

  clip(
    originBlob: Blob,
    startSecond: number,
    endSecond?: number,
  ): Promise<IOutput>;

  concat(blob: Blob[]): Promise<IOutput>;

  toBlob(audio: HTMLAudioElement): Promise<Blob>;

  toAudio(blob: Blob): Promise<HTMLAudioElement>;

  custom(config: ICustomConfig): Promise<IOutput>;

  clipConvert(
    arrayBuffer: ArrayBuffer,
    originType: MediaType,
    startSecond: number,
    endSecond?: number,
    progressCallback?: IProgressCallback,
  ): Promise<IOutput>;
}

export interface IPostInfo {
  type: string;
  arguments: string[];
  MEMFS: any[];
}

export interface IProgressCallback {
  (params: { progress: number; duration: number; currentTime: number }): void;
}
