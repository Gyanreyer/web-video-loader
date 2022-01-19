import { AudioCodecName, VideoCodecName, VideoContainerName } from "./types";

export interface VideoContainerConfig {
  fileExtension: string;
  defaultVideoCodec: VideoCodecName;
  defaultAudioCodec: AudioCodecName;
  supportedVideoCodecs: VideoCodecName[];
  supportedAudioCodecs: AudioCodecName[];
  additonalFfmpegOutputOptions: string | null;
  mimeTypeContainerString: string;
}

const videoContainers: { [key: string]: VideoContainerConfig } = {
  [VideoContainerName.mp4]: {
    fileExtension: "mp4",
    defaultVideoCodec: VideoCodecName.h_264,
    defaultAudioCodec: AudioCodecName.aac,
    supportedVideoCodecs: [
      VideoCodecName.av1,
      VideoCodecName.h_264,
      VideoCodecName.h_265,
    ],
    supportedAudioCodecs: [AudioCodecName.aac, AudioCodecName.muted],
    // Option allows us to pipe the mp4 file output as chunks to a data stream (see: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/344)
    additonalFfmpegOutputOptions:
      "-movflags frag_keyframe+empty_moov+faststart",
    mimeTypeContainerString: "video/mp4",
  },
  [VideoContainerName.webm]: {
    fileExtension: "webm",
    defaultVideoCodec: VideoCodecName.vp8,
    defaultAudioCodec: AudioCodecName.opus,
    supportedVideoCodecs: [
      VideoCodecName.av1,
      VideoCodecName.vp8,
      VideoCodecName.vp9,
    ],
    supportedAudioCodecs: [AudioCodecName.opus, AudioCodecName.muted],
    additonalFfmpegOutputOptions: null,
    mimeTypeContainerString: "video/webm",
  },
};

export default videoContainers;
