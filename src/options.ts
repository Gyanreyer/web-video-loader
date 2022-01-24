import {
  InputOptions,
  TransformConfig,
  VideoContainerName,
  VideoCodecName,
  AudioCodecName,
  OutputFileConfig,
  CompressionEfficiencyPreset,
} from "./types";
import videoContainers from "./videoContainers";

interface FullOptions {
  outputFiles: OutputFileConfig[];
  compressionSpeed: CompressionEfficiencyPreset;
  outputPath: string;
  publicPath: string | null;
  size: string | null;
  esModule: boolean;
  cache: boolean;
}

const DEFAULT_OPTIONS: FullOptions = {
  outputFiles: [
    {
      container: VideoContainerName.mp4,
      videoCodec: VideoCodecName.h_264,
    },
    {
      container: VideoContainerName.webm,
      videoCodec: VideoCodecName.vp9,
    },
  ],
  compressionSpeed: CompressionEfficiencyPreset.medium,
  outputPath: "/",
  publicPath: null,
  size: null,
  esModule: false,
  cache: true,
};

interface ParsedVideoCodec {
  codecType: "video";
  codecName: VideoCodecName;
  quality: number | "default";
}
interface ParsedAudioCodec {
  codecType: "audio";
  codecName: AudioCodecName;
  quality: number | "default";
}
interface ParsedUnknownCodec {
  codecType: "unknown";
  codecName: "default";
  quality: number | "default";
}

/**
 * Takes a codec string from an outputFile query param value and parses it into either an audio or video codec
 *
 * @example
 * parseCodecString("muted");     // { codecType: "audio", codecName: "muted", "quality": "default" }
 * parseCodecString("aac");       // { codecType: "audio", codecName: "aac", "quality": "default" }
 * parseCodecString("h.264");     // { codecType: "video", codecName: "h.264", "quality": "default" }
 * parseCodecString("h.265@40");  // { codecType: "video", codecName: "h.265", "quality": "40" }
 * parseCodecString("default");   // { codecType: "video", codecName: "default", "quality": "default" }
 */
function parseCodecString(
  codecString: string
): ParsedVideoCodec | ParsedAudioCodec | ParsedUnknownCodec {
  const [codecNameString, qualityString] = codecString.split("@");

  let quality: number | "default";

  if (qualityString !== undefined) {
    if (qualityString === "default") {
      quality = qualityString;
    } else {
      const qualityParsedAsNumber = Number(qualityString);

      if (qualityParsedAsNumber !== NaN) {
        quality = qualityParsedAsNumber;
      } else {
        throw new Error(
          `Video quality value "${qualityString}" from query param output config is not valid.`
        );
      }
    }
  } else {
    quality = "default";
  }

  if (
    Object.values(VideoCodecName).includes(codecNameString as VideoCodecName)
  ) {
    return {
      codecType: "video",
      codecName: codecNameString as VideoCodecName,
      quality,
    };
  } else if (
    Object.values(AudioCodecName).includes(codecNameString as AudioCodecName)
  ) {
    return {
      codecType: "audio",
      codecName: codecNameString as AudioCodecName,
      quality,
    };
  } else if (codecNameString === "default") {
    return {
      codecType: "unknown",
      codecName: "default",
      quality,
    };
  } else {
    throw new Error(
      `Invalid codec name "${codecNameString}" does not match any valid video or audio codecs.`
    );
  }
}

function parseOptionsFromResourceQuery(
  resourceQueryString: string
): InputOptions {
  const resourceQuerySearchParams = new URLSearchParams(resourceQueryString);

  // Convert our parsed search params to an object and extract all possible options
  const {
    outputFiles: rawOutputFiles,
    compressionSpeed: rawCompressionSpeed,
    outputPath: rawOutputPath,
    publicPath: rawPublicPath,
    size: rawSize,
    esModule: rawEsModule,
    cache: rawCache,
    ...otherParams
  } = Object.fromEntries(resourceQuerySearchParams);

  // Throw an error if the resource query includes any option params we're not expecting
  const invalidParamKeys = Object.keys(otherParams);
  if (invalidParamKeys.length !== 0) {
    throw new Error(
      `Received invalid params in resource query "${resourceQueryString}": ${invalidParamKeys.join(
        ", "
      )} ${
        invalidParamKeys.length === 1 ? "option is" : "options are"
      } not supported.`
    );
  }

  const parsedResourceQueryOptions: InputOptions = {};

  if (rawOutputFiles !== undefined) {
    parsedResourceQueryOptions.outputFiles = rawOutputFiles
      // The outputFiles query param takes a comma-separated list of output config strings
      .split(",")
      .map((outputFileString) => {
        /**
         * Output config strings can follow the following format...
         * 1. "container" -- only sets the container to use for the output file; video and audio codecs will be filled in with defaults for the container (ie, "mp4", "webm")
         * 2. "container/audioCodec" -- sets the container and audio codec for the output file; video codec will be filled in with default for the container (ie, "mp4/muted", "mp4/aac")
         * 3. "container/videoCodec/audioCodec" -- explicitly sets the container, video, and audio codecs for the output file (ie, "mp4/h.265/muted", "webm/vp9/opus")
         *
         * You can also define quality settings on video and audio codecs with the syntax "codec@quality" (ie, "mp4/h.265@40/aac@2")
         */
        const [containerString, ...codecStrings] = outputFileString.split("/");

        let containerName: VideoContainerName;

        if (
          Object.values(VideoContainerName).includes(
            containerString as VideoContainerName
          )
        ) {
          containerName = containerString as VideoContainerName;
        } else {
          throw new Error(
            `Value "${outputFileString}" provided to outputFiles query param does not start with a valid video container.`
          );
        }

        let videoCodecName: VideoCodecName | "default" | null = null;
        let videoQuality: number | "default" = "default";
        let audioCodecName: AudioCodecName | "default" | null = null;
        let audioQuality: number | "default" = "default";

        // Attempt to parse out video and/or audio codecs from the codec string(s)
        for (let i = 0; i < codecStrings.length; i += 1) {
          const parsedVideoOrAudioCodec = parseCodecString(codecStrings[i]);

          switch (parsedVideoOrAudioCodec.codecType) {
            case "video":
              if (!videoCodecName) {
                videoCodecName = parsedVideoOrAudioCodec.codecName;
                videoQuality = parsedVideoOrAudioCodec.quality;
              } else {
                throw new Error(
                  `Value "${outputFileString}" provided to outputFiles query param contains more than 1 video codec.`
                );
              }
              break;
            case "audio":
              if (!audioCodecName) {
                audioCodecName = parsedVideoOrAudioCodec.codecName;
                audioQuality = parsedVideoOrAudioCodec.quality;
              } else {
                throw new Error(
                  `Value "${outputFileString}" provided to outputFiles query param contains more than 1 audio codec.`
                );
              }
              break;
            default:
              // If the codec type is unknown and we haven't set a video codec yet,
              // assume it's for the video codec; otherwise fall back to the audio codec;
              // if both codecs have already been set, the codec string must be invalid
              // so throw an error
              if (!videoCodecName) {
                videoCodecName = "default";
                videoQuality = parsedVideoOrAudioCodec.quality;
              } else if (!audioCodecName) {
                audioCodecName = "default";
                audioQuality = parsedVideoOrAudioCodec.quality;
              } else {
                throw new Error(
                  `Value "${outputFileString}" provided to outputFiles query param is not formatted correctly. A "default" codec value was provided when both a video and audio codec have already been set.`
                );
              }
              break;
          }
        }

        return {
          container: containerName,
          videoCodec: videoCodecName || "default",
          videoQuality,
          audioCodec: audioCodecName || "default",
          audioQuality,
        };
      });
  }

  // If the compressionSpeed param is set, parse its value into a CompressionEfficiencyPreset
  if (rawCompressionSpeed) {
    if (rawCompressionSpeed in CompressionEfficiencyPreset) {
      parsedResourceQueryOptions.compressionSpeed =
        rawCompressionSpeed as CompressionEfficiencyPreset;
    } else {
      throw new Error(
        `Option "compressionSpeed=${rawCompressionSpeed}" does not match a valid compression speed preset.`
      );
    }
  }

  // The outputPath, publicPath, and size params are just strings without very easily enforcable rules,
  // so if any of them were set, pass them directly through to the parsed options
  if (rawOutputPath !== undefined) {
    parsedResourceQueryOptions.outputPath = rawOutputPath;
  }
  if (rawPublicPath !== undefined) {
    parsedResourceQueryOptions.publicPath = rawPublicPath;
  }
  if (rawSize !== undefined) {
    parsedResourceQueryOptions.size = rawSize;
  }

  // If the esModule param was set, parse its value into either true or false.
  // If the param is included with no value, ie "/video.mp4?esModule", its value will be an empty string
  // but it should be interpreted as being set to true.
  // Otherwise, the param can be set to either "true" or "false", ie "/video.mp4?esModule=false"
  if (rawEsModule !== undefined) {
    if (rawEsModule === "" || rawEsModule === "true") {
      parsedResourceQueryOptions.esModule = true;
    } else if (rawEsModule === "false") {
      parsedResourceQueryOptions.esModule = false;
    } else {
      throw new Error(`Option "esModule=${rawEsModule}"`);
    }
  }
  if (rawCache !== undefined) {
    if (rawCache === "" || rawCache === "true") {
      parsedResourceQueryOptions.cache = true;
    } else if (rawCache === "false") {
      parsedResourceQueryOptions.cache = false;
    } else {
      throw new Error(`Option "cache=${rawCache}"`);
    }
  }

  return parsedResourceQueryOptions;
}

export default function parseOptions(
  webpackOptions: InputOptions,
  resourceQueryString: string
): { transformConfigs: TransformConfig[]; esModule: boolean } {
  const resourceQueryOptions =
    parseOptionsFromResourceQuery(resourceQueryString);

  const combinedOptions: FullOptions = {
    ...DEFAULT_OPTIONS,
    ...webpackOptions,
    ...resourceQueryOptions,
  };

  const outputPath = combinedOptions.outputPath;
  const publicPath = combinedOptions.publicPath || outputPath;

  const transformConfigs =
    combinedOptions.outputFiles?.map((outputFileConfig) => {
      const videoContainerName = outputFileConfig.container;
      const videoContainerConfig = videoContainers[videoContainerName];

      if (!videoContainerConfig) {
        throw new Error(
          `Video container string "${videoContainerName}" does not match any supported containers.`
        );
      }

      let videoCodecName: VideoCodecName;

      if (
        outputFileConfig.videoCodec &&
        outputFileConfig.videoCodec !== "default"
      ) {
        videoCodecName = outputFileConfig.videoCodec;
      } else {
        videoCodecName = videoContainerConfig.defaultVideoCodec;
      }

      if (!videoContainerConfig.supportedVideoCodecs.includes(videoCodecName)) {
        throw new Error(
          `Video container "${videoContainerName}" does not support video codec "${videoCodecName}"`
        );
      }

      let audioCodecName: AudioCodecName;

      if (
        outputFileConfig.audioCodec &&
        outputFileConfig.audioCodec !== "default"
      ) {
        audioCodecName = outputFileConfig.audioCodec;
      } else {
        audioCodecName = videoContainerConfig.defaultAudioCodec;
      }

      const videoQuality = outputFileConfig.videoQuality || "default";
      const audioQuality = outputFileConfig.audioQuality || "default";

      return {
        transcodeConfig: {
          container: videoContainerName,
          videoCodec: videoCodecName,
          videoQuality,
          audioCodec: audioCodecName,
          audioQuality,
          size: combinedOptions.size,
          compressionSpeed: combinedOptions.compressionSpeed,
          cache: combinedOptions.cache,
        },
        outputPath,
        publicPath,
      };
    }) || [];

  return {
    transformConfigs,
    esModule: combinedOptions.esModule,
  };
}
