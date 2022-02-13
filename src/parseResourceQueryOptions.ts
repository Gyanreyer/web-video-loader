import { z } from "zod";

import {
  VideoContainerNameEnum,
  VideoCodecNameEnum,
  AudioCodecNameEnum,
  OutputFileConfigArray,
} from "./constants/zodTypes";
import { VideoCodecName, AudioCodecName } from "./constants/types";

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
  const videoCodecParseResult = VideoCodecNameEnum.safeParse(codecString);

  if (videoCodecParseResult.success) {
    return {
      codecType: "video",
      codecName: videoCodecParseResult.data,
    };
  }

  const audioCodecParseResult = AudioCodecNameEnum.safeParse(codecString);

  if (audioCodecParseResult.success) {
    return {
      codecType: "audio",
      codecName: audioCodecParseResult.data,
    };
  }

  throw new Error(
    `Invalid codec name "${codecString}" does not match any valid video or audio codecs.`
  );
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

// type OutputFileConfig = z.infer<typeof OutputFileConfig>;

const ParsedResourceQueryOptions = z.object({
  fileNameTemplate: z.string().optional(),
  outputFiles: OutputFileConfigArray.optional(),
  outputPath: z.string().optional(),
  publicPath: z.string().optional(),
  mute: z.boolean().optional(),
  size: z.string().optional(),
  esModule: z.boolean().optional(),
  cache: z.boolean().optional(),
});
type ParsedResourceQueryOptions = z.infer<typeof ParsedResourceQueryOptions>;

/**
 * Takes the resource query param string from the import path and
 * parses out any options that may be set there
 */
export default function parseOptionsFromResourceQuery(
  resourceQueryString: string
): ParsedResourceQueryOptions {
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

  const parsedResourceQueryOptions: ParsedResourceQueryOptions = {};

  if (rawOutputFiles !== undefined) {
    // The outputFiles query param takes a comma-separated list of output config strings
    const outputFileStrings = rawOutputFiles.split(",");

    if (outputFileStrings.length > 0) {
      parsedResourceQueryOptions.outputFiles = outputFileStrings.map(
        (outputFileString) => {
          /**
           * Output config strings can follow the following format...
           * 1. "container" -- only sets the container to use for the output file; video and audio codecs will be filled in with defaults for the container (ie, "mp4", "webm")
           * 2. "container/audioCodec" -- sets the container and audio codec for the output file; video codec will be filled in with default for the container (ie, "mp4/aac")
           * 3. "container/videoCodec/audioCodec" -- explicitly sets the container, video, and audio codecs for the output file (ie, "mp4/h.265/flac", "webm/vp9/opus")
           */
          const [containerString, ...codecStrings] =
            outputFileString.split("/");

          const containerName = VideoContainerNameEnum.parse(containerString);

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
        }
      );
    }
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
