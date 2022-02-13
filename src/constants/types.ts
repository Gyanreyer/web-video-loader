import { z } from "zod";
import {
  VideoContainerNameEnum,
  VideoCodecNameEnum,
  AudioCodecNameEnum,
} from "./zodTypes";

export type VideoContainerName = z.infer<typeof VideoContainerNameEnum>;
export type VideoCodecName = z.infer<typeof VideoCodecNameEnum> | "default";
export type AudioCodecName = z.infer<typeof AudioCodecNameEnum> | "default";

export interface VideoTranscodeConfig {
  container: VideoContainerName;
  videoCodec: VideoCodecName;
  audioCodec: AudioCodecName;
  mute: boolean;
  size: string | null;
  cache: boolean;
}

export interface TransformConfig {
  transcodeConfig: VideoTranscodeConfig;
  outputPath: string;
  publicPath: string;
  fileNameTemplate: string;
}
