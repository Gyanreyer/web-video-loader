import { z } from "zod";

export const VideoContainerNameEnum = z.enum(["mp4", "webm"]);

export const VideoCodecNameEnum = z.enum([
  "av1",
  "h.264",
  "h.265",
  "vp8",
  "vp9",
]);

export const AudioCodecNameEnum = z.enum(["aac", "flac", "opus", "vorbis"]);

const defaultCodecLiteral = z.literal("default");

export const OutputFileConfig = z.object({
  container: VideoContainerNameEnum,
  videoCodec: VideoCodecNameEnum.or(defaultCodecLiteral).default("default"),
  audioCodec: AudioCodecNameEnum.or(defaultCodecLiteral).default("default"),
});
export const OutputFileConfigArray = OutputFileConfig.array();
