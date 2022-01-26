import {
  InputOptions,
  TransformConfig,
  VideoContainerName,
  VideoCodecName,
  AudioCodecName,
  OutputFileConfig,
} from "./types";
import videoContainers from "./videoContainers";

interface FullOptions {
  fileNameTemplate: string;
  outputFiles: OutputFileConfig[];
  outputPath: string;
  publicPath: string | null;
  mute: boolean;
  size: string | null;
  esModule: boolean;
  cache: boolean;
}

const DEFAULT_OPTIONS: FullOptions = {
  fileNameTemplate: "[originalFileName]-[hash]",
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
  outputPath: "/",
  publicPath: null,
  mute: false,
  size: null,
  esModule: false,
  cache: true,
};

interface ParsedVideoCodec {
  codecType: "video";
  codecName: VideoCodecName;
}
interface ParsedAudioCodec {
  codecType: "audio";
  codecName: AudioCodecName;
}

/**
 * Takes a codec string from an outputFile query param value and parses it into either an audio or video codec
 *
 * @example
 * parseCodecString("aac");       // { codecType: "audio", codecName: "aac" }
 * parseCodecString("h.264");     // { codecType: "video", codecName: "h.264" }
 * parseCodecString("h.265");     // { codecType: "video", codecName: "h.265" }
 */
function parseCodecString(
  codecString: string
): ParsedVideoCodec | ParsedAudioCodec {
  if (Object.values(VideoCodecName).includes(codecString as VideoCodecName)) {
    return {
      codecType: "video",
      codecName: codecString as VideoCodecName,
    };
  } else if (
    Object.values(AudioCodecName).includes(codecString as AudioCodecName)
  ) {
    return {
      codecType: "audio",
      codecName: codecString as AudioCodecName,
    };
  } else {
    throw new Error(
      `Invalid codec name "${codecString}" does not match any valid video or audio codecs.`
    );
  }
}

/**
 * Parse a boolean query param value into either true or false.
 * If the param is included with no value, ie "/video.mp4?esModule", its value will be an empty string
 * but it should be interpreted as being set to true.
 * Otherwise, the param can be set to either "true" or "false", ie "/video.mp4?esModule=false"
 */
function parseBooleanFromQueryParamValue(
  paramValue: string,
  paramKey: string
): boolean {
  if (paramValue === "" || paramValue === "true") {
    return true;
  } else if (paramValue === "false") {
    return false;
  }

  throw new Error(`Option "${paramKey}=${paramValue}" is not a valid boolean`);
}

/**
 * Takes the resource query param string from the import path and
 * parses out any options that may be set there
 */
function parseOptionsFromResourceQuery(
  resourceQueryString: string
): InputOptions {
  const resourceQuerySearchParams = new URLSearchParams(resourceQueryString);

  // Convert our parsed search params to an object and extract all possible options
  const {
    outputFiles: rawOutputFiles,
    outputPath: rawOutputPath,
    publicPath: rawPublicPath,
    size: rawSize,
    esModule: rawEsModule,
    cache: rawCache,
    mute: rawMute,
    fileNameTemplate: rawFileNameTemplate,
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
         * 2. "container/audioCodec" -- sets the container and audio codec for the output file; video codec will be filled in with default for the container (ie, "mp4/aac")
         * 3. "container/videoCodec/audioCodec" -- explicitly sets the container, video, and audio codecs for the output file (ie, "mp4/h.265/flac", "webm/vp9/opus")
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

        let videoCodecName: VideoCodecName | null = null;
        let audioCodecName: AudioCodecName | null = null;

        // Attempt to parse out video and/or audio codecs from the codec string(s)
        for (let i = 0; i < codecStrings.length; i += 1) {
          const parsedVideoOrAudioCodec = parseCodecString(codecStrings[i]);

          switch (parsedVideoOrAudioCodec.codecType) {
            case "video":
              if (!videoCodecName) {
                videoCodecName = parsedVideoOrAudioCodec.codecName;
              } else {
                throw new Error(
                  `Value "${outputFileString}" provided to outputFiles query param contains more than 1 video codec.`
                );
              }
              break;
            case "audio":
              if (!audioCodecName) {
                audioCodecName = parsedVideoOrAudioCodec.codecName;
              } else {
                throw new Error(
                  `Value "${outputFileString}" provided to outputFiles query param contains more than 1 audio codec.`
                );
              }
              break;
          }
        }

        return {
          container: containerName,
          videoCodec: videoCodecName || "default",
          audioCodec: audioCodecName || "default",
        };
      });
  }

  // Directly pass through any params whose values are just strings
  // which don't require parsing
  if (rawOutputPath !== undefined) {
    parsedResourceQueryOptions.outputPath = rawOutputPath;
  }
  if (rawPublicPath !== undefined) {
    parsedResourceQueryOptions.publicPath = rawPublicPath;
  }
  if (rawSize !== undefined) {
    parsedResourceQueryOptions.size = rawSize;
  }
  if (rawFileNameTemplate !== undefined) {
    parsedResourceQueryOptions.fileNameTemplate = rawFileNameTemplate;
  }

  // Parse any boolean option values
  if (rawEsModule !== undefined) {
    parsedResourceQueryOptions.esModule = parseBooleanFromQueryParamValue(
      rawEsModule,
      "esModule"
    );
  }
  if (rawCache !== undefined) {
    parsedResourceQueryOptions.cache = parseBooleanFromQueryParamValue(
      rawCache,
      "cache"
    );
  }
  if (rawMute !== undefined) {
    parsedResourceQueryOptions.mute = parseBooleanFromQueryParamValue(
      rawMute,
      "mute"
    );
  }

  return parsedResourceQueryOptions;
}

/**
 * Parse a config for how we should transcode the video from all
 * webpack options set via the webpack config and/or query params
 * on the asset's import path.
 *
 * @param {InputOptions}  webpackOptions  An object with all options set on web-video-loader in the webpack config
 * @param {string}  resourceQueryString   A string with all query params set on the asset's import path
 *                                          (ie, `const video = require('./video.mp4?size=320x?');` --> "?size=320x?")
 */
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

      if (!videoContainerConfig.supportedAudioCodecs.includes(audioCodecName)) {
        throw new Error(
          `Video container "${videoContainerName}" does not support audio codec "${audioCodecName}"`
        );
      }

      return {
        transcodeConfig: {
          container: videoContainerName,
          videoCodec: videoCodecName,
          audioCodec: audioCodecName,
          mute: combinedOptions.mute,
          size: combinedOptions.size,
          cache: combinedOptions.cache,
        },
        outputPath,
        publicPath,
        fileNameTemplate: combinedOptions.fileNameTemplate,
      };
    }) || [];

  return {
    transformConfigs,
    esModule: combinedOptions.esModule,
  };
}
