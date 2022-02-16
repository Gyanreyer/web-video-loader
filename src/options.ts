import parseOptionsFromResourceQuery from "./parseResourceQueryOptions";

// Constants
import videoContainers from "./constants/videoContainers";

// Types
import { Options } from "./constants/zodTypes";
import {
  VideoCodecName,
  AudioCodecName,
  TransformConfig,
} from "./constants/types";

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
  webpackOptions: unknown,
  resourceQueryString: string
): { transformConfigs: TransformConfig[]; esModule: boolean } {
  const resourceQueryOptions =
    parseOptionsFromResourceQuery(resourceQueryString);

  const validateWebpackOptionsResult = Options.safeParse(webpackOptions);

  if (!validateWebpackOptionsResult.success) {
    throw new Error(
      `web-video-loader received invalid value for option "${validateWebpackOptionsResult.error.errors[0].path}": ${validateWebpackOptionsResult.error.errors[0].message}`
    );
  }

  const parsedWebpackOptions = validateWebpackOptionsResult.data;

  const combinedOptions = {
    ...parsedWebpackOptions,
    ...resourceQueryOptions,
  };

  const outputPath = combinedOptions.outputPath;
  const publicPath = combinedOptions.publicPath || outputPath;

  const transformConfigs =
    combinedOptions.outputFormats?.map((outputFileConfig): TransformConfig => {
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
