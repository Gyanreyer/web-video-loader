import {
  VideoContainerNameEnum,
  VideoCodecNameEnum,
  AudioCodecNameEnum,
} from "./zodTypes";
import { VideoCodecName, AudioCodecName } from "./types";

interface VideoContainerConfig {
  fileExtension: string;
  defaultVideoCodec: VideoCodecName;
  defaultAudioCodec: AudioCodecName;
  supportedVideoCodecs: VideoCodecName[];
  supportedAudioCodecs: AudioCodecName[];
  mimeTypeContainerString: string;
  ffmpegOptions: string[];
}

const videoContainers: { [key: string]: VideoContainerConfig } = {
  [VideoContainerNameEnum.enum.mp4]: {
    fileExtension: "mp4",
    defaultVideoCodec: VideoCodecNameEnum.enum["h.264"],
    defaultAudioCodec: AudioCodecNameEnum.enum.aac,
    supportedVideoCodecs: [
      VideoCodecNameEnum.enum.av1,
      VideoCodecNameEnum.enum["h.264"],
      VideoCodecNameEnum.enum["h.265"],
    ],
    supportedAudioCodecs: [
      AudioCodecNameEnum.enum.aac,
      AudioCodecNameEnum.enum.flac,
    ],
    mimeTypeContainerString: "video/mp4",
    ffmpegOptions: [
      // moveflags options enable encoding mp4 files in chunks so we can write to a stream
      // rather than creating a file
      "-movflags frag_keyframe+empty_moov+faststart",
    ],
  },
  [VideoContainerNameEnum.enum.webm]: {
    fileExtension: "webm",
    defaultVideoCodec: VideoCodecNameEnum.enum.vp9,
    defaultAudioCodec: AudioCodecNameEnum.enum.opus,
    supportedVideoCodecs: [
      VideoCodecNameEnum.enum.vp8,
      VideoCodecNameEnum.enum.vp9,
    ],
    supportedAudioCodecs: [
      AudioCodecNameEnum.enum.opus,
      AudioCodecNameEnum.enum.vorbis,
    ],
    mimeTypeContainerString: "video/webm",
    ffmpegOptions: [],
  },
};

export default videoContainers;
