import { AudioCodecNameEnum } from "./zodTypes";

interface AudioCodecConfig {
  ffmpegCodecString: string;
}

const audioCodecs: { [key: string]: AudioCodecConfig } = {
  // https://trac.ffmpeg.org/wiki/Encode/AAC
  [AudioCodecNameEnum.enum.aac]: {
    ffmpegCodecString: "aac",
  },
  [AudioCodecNameEnum.enum.flac]: {
    ffmpegCodecString: "flac",
  },
  [AudioCodecNameEnum.enum.opus]: {
    ffmpegCodecString: "libopus",
  },
  [AudioCodecNameEnum.enum.vorbis]: {
    ffmpegCodecString: "libvorbis",
  },
};

export default audioCodecs;
