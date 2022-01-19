import { AudioCodecName } from "./types";

interface AudioCodecConfig {
  ffmpegCodecString: string;
  qualityFfmpegCommandName: string;
  qualityMin: number;
  qualityMax: number;
  defaultQuality: number;
}

const audioCodecs: { [key: string]: AudioCodecConfig } = {
  // https://trac.ffmpeg.org/wiki/Encode/AAC
  [AudioCodecName.aac]: {
    ffmpegCodecString: "aac",
    qualityFfmpegCommandName: "q:a",
    qualityMin: 0.1,
    qualityMax: 2,
    defaultQuality: 1,
  },
  [AudioCodecName.opus]: {
    ffmpegCodecString: "libopus",
    qualityFfmpegCommandName: "compression_level",
    qualityMin: 0,
    qualityMax: 10,
    defaultQuality: 7,
  },
};

export default audioCodecs;
