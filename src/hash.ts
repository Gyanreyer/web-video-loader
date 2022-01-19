import { promises as fsPromises } from "fs";
import { createHash } from "crypto";
import { CompressionEfficiencyPreset, OutputFileConfig } from "./types";

/**
 * Generates a unique hashed file name for a video file that the loader will emit.
 * This hash is deterministic based on the input file's data and the config for how
 * ffmpeg should generate the output, so videos can be cached but will be invalidated if
 * the webpack configuration or video file changes.
 *
 * @param {string} filePath
 * @param {OutputFileConfig} fileConfiguration
 * @param {CompressionEfficiencyPreset} compressionEfficiencyPreset
 * @returns {string}  Unique hash string to use for the output file's name
 */
export async function getFileHash(
  filePath: string,
  fileConfiguration: OutputFileConfig,
  compressionEfficiencyPreset: CompressionEfficiencyPreset
): Promise<string> {
  const fileBuffer = await fsPromises.readFile(filePath);

  return createHash("sha256")
    .update(fileBuffer)
    .update(JSON.stringify(fileConfiguration))
    .update(compressionEfficiencyPreset)
    .digest("hex");
}
