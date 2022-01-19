import { AudioCodecName, VideoCodecName } from "./types";

interface CodecSupportDetails<CodecType> {
  fullySupported: CodecType[];
  partiallySupported: CodecType[];
  unsupported: CodecType[];
}

interface BrowserProfile {
  videoCodecs: CodecSupportDetails<VideoCodecName>;
  audioCodecs: CodecSupportDetails<AudioCodecName>;
}

export const safari: BrowserProfile = {
  videoCodecs: {
    fullySupported: [VideoCodecName.h_264, VideoCodecName.h_265],
    partiallySupported: [VideoCodecName.vp8, VideoCodecName.vp9],
    unsupported: [VideoCodecName.av1],
  },
  audioCodecs: {
    fullySupported: [AudioCodecName.aac],
    partiallySupported: [AudioCodecName.opus],
    unsupported: [],
  },
};

export const chromiumAndFirefox: BrowserProfile = {
  videoCodecs: {
    fullySupported: [
      VideoCodecName.h_264,
      VideoCodecName.vp8,
      VideoCodecName.vp9,
      VideoCodecName.av1,
    ],
    partiallySupported: [],
    unsupported: [VideoCodecName.h_265],
  },
  audioCodecs: {
    fullySupported: [AudioCodecName.aac, AudioCodecName.opus],
    partiallySupported: [],
    unsupported: [],
  },
};

export const internetExplorer: BrowserProfile = {
  videoCodecs: {
    fullySupported: [VideoCodecName.h_264],
    partiallySupported: [VideoCodecName.h_265],
    unsupported: [VideoCodecName.vp8, VideoCodecName.vp9, VideoCodecName.av1],
  },
  audioCodecs: {
    fullySupported: [AudioCodecName.aac],
    partiallySupported: [],
    unsupported: [AudioCodecName.opus],
  },
};
