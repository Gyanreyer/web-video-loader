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

type OutputFileConfigArray = z.infer<typeof OutputFileConfigArray>;

// By default, output files names should include the original file name + the unique
// hash for the output's config
const DEFAULT_FILE_NAME_TEMPLATE = "[originalFileName]-[hash]";

// Output to root of the build destination directory by default
const DEFAULT_OUTPUT_PATH = "/";

// Sensible widely supported video files to output by default
const DEFAULT_OUTPUT_FILES: OutputFileConfigArray = [
  {
    container: VideoContainerNameEnum.enum.mp4,
    videoCodec: VideoCodecNameEnum.enum["h.264"],
    audioCodec: "default",
  },
  {
    container: VideoContainerNameEnum.enum.webm,
    videoCodec: VideoCodecNameEnum.enum.vp9,
    audioCodec: "default",
  },
];

export const Options = z.object({
  fileNameTemplate: z.string().default(DEFAULT_FILE_NAME_TEMPLATE),
  outputFormats: OutputFileConfigArray.default(DEFAULT_OUTPUT_FILES),
  outputPath: z.string().default(DEFAULT_OUTPUT_PATH),
  publicPath: z.string().nullish().default(null),
  // Preserve any audio on the input file by default
  mute: z.boolean().default(false),
  // Preserve the input files' dimensions by default
  size: z.string().nullish().default(null),
  // Output should be use commonjs exports by default
  esModule: z.boolean().default(false),
  // Output files should be cached by default
  cache: z.boolean().default(true),
});
