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
  videoCodec?: VideoCodecName;
  // h.264: crf = 0–51; 23 is default, 18 is considered visually lossless
  // h.265: crf = 0-51; 28 is default and visually about equivalent to h.264 at 23
  // av1: crf = 0–63; default to 30
  // vp8: crf = 4–63; default to 30
  // vp9: crf = 4–63; default to 30; recommended to do two passes when encoding to get the best compression possible, but this is obviously expensive; will think on itF
  videoQuality?: number | "default";
  audioCodec?: AudioCodecName;
  // aac: q:a = 1-5; 1 is lowest quality + smallest file size / 5 is highest quality + largest file size
  // opus: compression_level:a/comp:a = 0-10; 0 is fastest encode + smallest file size + lowest quality / 10 is slowest encode + largest file size +i highest quality
  audioQuality?: number | "default";
  compressionEfficiencyPreset?: CompressionEfficiencyPreset;
}

export interface Options {
  outputFiles?: OutputFileConfig[];
  compressionSpeed?: CompressionEfficiencyPreset;
  outputPath?: string;
  publicPath?: string;
}
