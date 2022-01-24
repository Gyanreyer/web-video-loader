import { createHash } from "crypto";
import { VideoTranscodeConfig } from "./types";

/**
 * Generates a unique hashed file name for a video file that the loader will emit.
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
