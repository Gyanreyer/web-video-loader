import { createHash } from "crypto";
import path from "path";

import { AudioCodecName, VideoCodecName, VideoTranscodeConfig } from "./types";

/**
 * Generates a unique hashed string for a video output which can be used to identify it.
 * This hash is deterministic based on the input file's data and the config for how
 * ffmpeg should generate the output, so videos can be cached but will be invalidated if
 * the webpack configuration or video file changes.
 *
 * @param {string}  inputFileSource   Source string representing the input file's contents which is passed to the webpack loader function
 * @param {VideoTranscodeConfig}  transcodeConfig   Config describing how the video should be transcoded into an output
 * @returns {string}  Unique hash string to use for the output file's name
 */
export function getFileHash(
  inputFileSource: string,
  transcodeConfig: VideoTranscodeConfig
): string {
  return createHash("shake256", { outputLength: 20 })
    .update(inputFileSource)
    .update(JSON.stringify(transcodeConfig))
    .digest("hex");
}

/**
 * Takes a file name template and a variety of relevant information about the video
 * and constructs a file name to use for the output based on the template,
 * along with a simpler "cache file name" which should be used for reading/writing this video
 * in the cache directory.
 *
 * File name templates support the following tags:
 * "[hash]": The unique hash string identifying the video output
 * "[originalFileName]": The name of the original input file, without the file extension
 * "[videoCodec]": The name of the video codec that is being used for this output
 * "[audioCodec]": The name of the audio codec that is being used for this output
 *
 * Example:
 * "[originalFileName]-[hash]" --> "BigBuckBunny-abcd1234"
 */
export function getFileNamesForVideo(
  fileNameTemplate: string,
  fileHash: string,
  inputFilePath: string,
  outputFileExtension: string,
  videoCodecName: VideoCodecName,
  audioCodecName: AudioCodecName
): { outputFileName: string; cacheFileName: string } {
  // Get the input file's name without the extension so we can insert that where necessary in the template
  const inputFileName = path.basename(
    inputFilePath,
    path.extname(inputFilePath)
  );

  // Construct the file name that we should use for our output
  // by taking the file name template and filling in any provided tags
  // with their corresponding values.
  return {
    outputFileName: `${fileNameTemplate
      .replace(/\[hash\]/g, fileHash)
      .replace(/\[originalFileName\]/g, inputFileName)
      .replace(/\[videoCodec\]/g, videoCodecName.replace(".", "_"))
      .replace(/\[audioCodec\]/g, audioCodecName)}.${outputFileExtension}`,
    // only use the hash + file extension for the cached file name so changes to the file name template doesn't make a difference
    cacheFileName: `${fileHash}.${outputFileExtension}`,
  };
}
