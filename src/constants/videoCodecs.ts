import { VideoCodecNameEnum } from "./zodTypes";

interface VideoCodecConfig {
  ffmpegCodecString: string;
  mimeTypeCodecString: string | null;
  additonalFfmpegOptions?: string[];
}

const videoCodecs: { [key: string]: VideoCodecConfig } = {
  // https://trac.ffmpeg.org/wiki/Encode/AV1
  [VideoCodecNameEnum.enum.av1]: {
    ffmpegCodecString: "libaom-av1",
    mimeTypeCodecString: "av01",
    // These settings have achieved a VMAF score of 96 in testing
    additonalFfmpegOptions: [
      // cpu-used accepts a value from 0-8 defining how much we should prioritize encoding speed over quality.
      // Maxing out to 8 only results in a ~2% quality reduction compared to 0 but SIGNIFICANTLY reduces
      // encoding times by as much as 98%
      // (source: https://streaminglearningcenter.com/encoding/choosing-the-optimal-preset-for-av1-encoding-and-other-questions.html)
      "-cpu-used 8",
      // crf enables using a variable bitrate to save file size on less complex portions of the video while still targeting
      // a consistent visual quality. This option accepts a value 0-63, where 0 is highest quality and largest file size
      // and 63 is lowest quality but smallest file size.
      // 25 produces decent quality while also making a significant difference in encode time and file size.
      // (source: https://streaminglearningcenter.com/learning/choosing-the-optimal-crf-value-for-capped-crf-encoding.html)
      "-crf 25",
      // AV1 requires that we set the target bitrate to 0 when using crf
      "-b:v 0",
      // Set row-mt and tile grid options to break the video into segments which can transcoded in parallel via multithreading
      "-row-mt 1",
      // tile-columns and tile-rows values are, confusingly, in log2 format, so a value of 1 means 2, 2->4, 3->8, etc.
      // That means this setting produces a 2x2 grid of 4 tiles.
      // There are resolution limitations to the number of tiles a video can be split into so
      // this won't make a difference in lower-resolution videos, but will definitely make a difference with 1080p+ resolutions
      "-tile-columns 1",
      "-tile-rows 1",
      // Flags enable encoding av1 to a stream buffer
      "-movflags frag_keyframe+empty_moov",
      "-movflags +faststart",
    ],
  },
  // https://trac.ffmpeg.org/wiki/Encode/H.264
  [VideoCodecNameEnum.enum["h.264"]]: {
    ffmpegCodecString: "libx264",
    // constructing a codec string for h.264 is a huge pain and we can pretty much guarantee every browser supports it anyways
    // so there's less value in specifying a codec on the MIME type
    mimeTypeCodecString: null,
    // These settings have achieved a VMAF score of 95 in testing
    additonalFfmpegOptions: [
      // crf enables using a variable bitrate to save file size on less complex portions of the video while still targeting
      // a consistent visual quality. This option accepts a value 0-51, where 0 is highest quality and largest file size and
      // 51 is lowest quality but smallest file size.
      // 23 is a reasonable default for h.264 that produces a good balance between quality and file size.
      "-crf 23",
      // preset defines various presets for how the encoding should balance encoding speed vs compression quality;
      // this means that slower settings will have better compression and therefore produce smaller files, at the tradeoff
      // of taking longer.
      // "medium" is a sensible default which produces a good balance between a fast encode time and a relatively small file.
      "-preset medium",
      // Flags enable encoding h.264 to a stream buffer
      "-movflags frag_keyframe+empty_moov",
      "-movflags +faststart",
    ],
  },
  // https://trac.ffmpeg.org/wiki/Encode/H.265
  [VideoCodecNameEnum.enum["h.265"]]: {
    ffmpegCodecString: "libx265",
    mimeTypeCodecString: "hvc1",
    // These settings have achieved a VMAF score of 92 in testing
    additonalFfmpegOptions: [
      // Add a tag to ensure apple devices can recognize the file as h.265 and play it correctly
      // https://aaron.cc/ffmpeg-hevc-apple-devices/
      "-tag:v hvc1",
      // like h.264, crf can be a value 0-51.
      // 28 is a reasonable default which achieves a similar level of quality to h.264 at crf 23
      "-crf 28",
      "-preset medium",
      // Flags enable encoding h.265 to a stream buffer
      "-movflags frag_keyframe+empty_moov",
      "-movflags +faststart",
    ],
  },
  // https://trac.ffmpeg.org/wiki/Encode/VP8
  // https://www.webmproject.org/docs/encoder-parameters/
  [VideoCodecNameEnum.enum.vp8]: {
    ffmpegCodecString: "libvpx",
    mimeTypeCodecString: "vp8",
    // These settings have achieved a VMAF score of 78 in testing; not good, using vp8 is not recommended
    additonalFfmpegOptions: [
      "-crf 10",
      // deadline option takes a preset value which defines how to balance between encoding speed and quality
      // "good" is a good default for most cases
      "-deadline good",
      "-cpu-used 2",
    ],
  },
  // https://trac.ffmpeg.org/wiki/Encode/VP9
  [VideoCodecNameEnum.enum.vp9]: {
    ffmpegCodecString: "libvpx-vp9",
    mimeTypeCodecString: "vp9",
    // These settings have achieved a VMAF score of 91 in testing
    additonalFfmpegOptions: [
      "-crf 32",
      "-b:v 0",
      "-deadline good",
      "-cpu-used 2",
      "-row-mt 1",
      "-tile-columns 1",
      "-tile-rows 1",
    ],
  },
};

export default videoCodecs;
