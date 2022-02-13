import { z } from "zod";

import {
  OutputFileConfigArray,
  VideoContainerNameEnum,
  VideoCodecNameEnum,
} from "./zodTypes";

export const defaultFileNameTemplate = "[originalFileName]-[hash]";

type OutputFileConfigArray = z.infer<typeof OutputFileConfigArray>;

export const defaultOutputFiles: OutputFileConfigArray = [
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
