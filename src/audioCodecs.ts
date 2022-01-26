import { AudioCodecName } from "./types";

interface AudioCodecConfig {
  ffmpegCodecString: string;
}

const audioCodecs: { [key: string]: AudioCodecConfig } = {
  // https://trac.ffmpeg.org/wiki/Encode/AAC
  [AudioCodecName.aac]: {
    ffmpegCodecString: "aac",
  },
  [AudioCodecName.flac]: {
    ffmpegCodecString: "flac",
  },
  [AudioCodecName.opus]: {
    ffmpegCodecString: "libopus",
  },
  [AudioCodecName.vorbis]: {
    ffmpegCodecString: "libvorbis",
  },
};

export default audioCodecs;
