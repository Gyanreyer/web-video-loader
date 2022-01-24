import { VideoCodecName } from "./types";

interface VideoCodecConfig {
  ffmpegCodecString: string;
  qualityMin: number;
  qualityMax: number;
  mimeTypeCodecString: string | null;
  additonalFfmpegOptions?: string[];
}

const videoCodecs: { [key: string]: VideoCodecConfig } = {
  // https://trac.ffmpeg.org/wiki/Encode/AV1
  [VideoCodecName.av1]: {
    ffmpegCodecString: "libaom-av1",
    qualityMin: 0,
    qualityMax: 63,
    mimeTypeCodecString: "av01",
  },
  // https://trac.ffmpeg.org/wiki/Encode/H.264
  [VideoCodecName.h_264]: {
    ffmpegCodecString: "libx264",
    qualityMin: 0,
    qualityMax: 51,
    // constructing a codec string for h.264 is a huge pain and we can pretty much guarantee every browser supports it anyways
    // so there's less value in specifying a codec on the MIME type
    mimeTypeCodecString: null,
  },
  // https://trac.ffmpeg.org/wiki/Encode/H.265
  [VideoCodecName.h_265]: {
    ffmpegCodecString: "libx265",
    qualityMin: 0,
    qualityMax: 51,
    mimeTypeCodecString: "hvc1",
    // Add a tag to ensure apple devices can recognize the file as h.265 and play it correctly
    // https://aaron.cc/ffmpeg-hevc-apple-devices/
    additonalFfmpegOptions: ["-tag:v hvc1"],
  },
  // https://trac.ffmpeg.org/wiki/Encode/VP8
  [VideoCodecName.vp8]: {
    ffmpegCodecString: "libvpx",
    qualityMin: 4,
    qualityMax: 63,
    mimeTypeCodecString: "vp8",
  },
  // https://trac.ffmpeg.org/wiki/Encode/VP9
  [VideoCodecName.vp9]: {
    ffmpegCodecString: "libvpx-vp9",
    qualityMin: 4,
    qualityMax: 63,
    mimeTypeCodecString: "vp9",
  },
};

export default videoCodecs;
