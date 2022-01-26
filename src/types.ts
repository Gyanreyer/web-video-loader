export enum VideoContainerName {
  mp4 = "mp4",
  webm = "webm",
}

export enum VideoCodecName {
  av1 = "av1",
  h_264 = "h.264",
  h_265 = "h.265",
  vp8 = "vp8",
  vp9 = "vp9",
}

export enum AudioCodecName {
  aac = "aac",
  flac = "flac",
  opus = "opus",
  vorbis = "vorbis",
}

export interface OutputFileConfig {
  container: VideoContainerName;
  videoCodec?: VideoCodecName | "default";
  audioCodec?: AudioCodecName | "default";
}

export interface InputOptions {
  fileNameTemplate?: string;
  outputFiles?: OutputFileConfig[];
  outputPath?: string;
  publicPath?: string;
  mute?: boolean;
  size?: string;
  esModule?: boolean;
  cache?: boolean;
}

export interface VideoTranscodeConfig {
  container: VideoContainerName;
  videoCodec: VideoCodecName;
  audioCodec: AudioCodecName;
  size: string | null;
  cache: boolean;
  mute: boolean;
}

export interface TransformConfig {
  transcodeConfig: VideoTranscodeConfig;
  outputPath: string;
  publicPath: string;
  fileNameTemplate: string;
}
