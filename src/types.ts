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
  opus = "opus",
  muted = "muted",
}

export enum CompressionEfficiencyPreset {
  ultrafast = "ultrafast",
  superfast = "superfast",
  veryfast = "veryfast",
  faster = "faster",
  fast = "fast",
  medium = "medium",
  slow = "slow",
  slower = "slower",
  veryslow = "veryslow",
}

export interface OutputFileConfig {
  container: VideoContainerName;
  videoCodec?: VideoCodecName | "default";
  audioCodec?: AudioCodecName | "default";
}

export interface InputOptions {
  outputFiles?: OutputFileConfig[];
  compressionSpeed?: CompressionEfficiencyPreset;
  outputPath?: string;
  publicPath?: string;
  size?: string;
  esModule?: boolean;
  cache?: boolean;
}

export interface VideoTranscodeConfig {
  container: VideoContainerName;
  videoCodec: VideoCodecName;
  audioCodec: AudioCodecName;
  compressionSpeed: CompressionEfficiencyPreset;
  size: string | null;
  cache: boolean;
}

export interface TransformConfig {
  transcodeConfig: VideoTranscodeConfig;
  outputPath: string;
  publicPath: string;
}
