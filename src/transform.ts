import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import * as ffmpeg from "fluent-ffmpeg";
import type { LoaderContext } from "webpack";
import { promises as fsPromises } from "fs";
import * as path from "path";
import { promisify } from "util";
import * as zlib from "zlib";

import {
  VideoCodecName,
  AudioCodecName,
  OutputFileConfig,
  CompressionEfficiencyPreset,
  Options,
} from "./types";
import videoCodecs from "./videoCodecs";
import videoContainers from "./videoContainers";
import audioCodecs from "./audioCodecs";
import { getFileHash } from "./hash";
import { cacheDirectory } from "./cache";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

ffmpeg.setFfmpegPath(ffmpegPath);

export default async function transform(
  originalFilePath: string,
  outputDirectory: string,
  publicPath: string,
  outputFileConfig: OutputFileConfig,
  compressionEfficiencyPreset: CompressionEfficiencyPreset,
  emitFile: LoaderContext<Options>["emitFile"]
): Promise<{
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}> {
  const videoContainerName = outputFileConfig.container;
  const videoContainerConfig = videoContainers[videoContainerName];

  if (!videoContainerConfig) {
    throw new Error(
      `Video container string "${videoContainerName}" does not match any supported containers.`
    );
  }

  const videoCodecName =
    outputFileConfig.videoCodec || videoContainerConfig.defaultVideoCodec;
  const videoCodecConfig = videoCodecs[videoCodecName];

  if (!videoCodecConfig) {
    throw new Error(
      `Video codec string "${videoCodecName}" does not match any supported codecs.`
    );
  }

  if (!videoContainerConfig.supportedVideoCodecs.includes(videoCodecName)) {
    throw new Error(
      `Video container "${videoContainerName}" does not support video codec "${videoCodecName}"`
    );
  }

  // Get unique hash string to use for the name of the video file we're going to output
  const fileHash = await getFileHash(
    originalFilePath,
    outputFileConfig,
    compressionEfficiencyPreset
  );

  // The output file name will be the hash + the appropriate extension for the selected container (ie, ".mp4", ".webm")
  const transcodedFileName = `${fileHash}.${videoContainerConfig.fileExtension}`;
  // Construct a string representing the MIME type of the video file which can be set on a
  // <source> tag's `type` attribute to help hint to browsers whether they can play the video or not
  const mimeType = `${videoContainerConfig.mimeTypeContainerString}${
    // Add a `codecs` param to the MIME type if the codec config has one; this provides additional information to browsers
    // to help them determine if they can play the video file because a browser can support the container being used but not the codec
    // (ie, all browsers support the .mp4 container, but only Safari supports the h.265/`hvc1` codec)
    videoCodecConfig.mimeTypeCodecString
      ? `;codecs="${videoCodecConfig.mimeTypeCodecString}"`
      : ""
  }`;

  // File path that the video will be stored at; this path is relative to the webpack output directory,
  // so if the output directory is `./dist` and the `outputDirectory` is set to `assets/videos`, the video files
  // will end up being created in `./dist/assets/videos`
  const outputFilePath = path.join(outputDirectory, transcodedFileName);

  // URL path which the video file can be loaded from via an `src` attribute in the app
  const outputFileSrc = `${publicPath}${
    publicPath.endsWith("/") ? "" : "/"
  }${transcodedFileName}`;

  if (!cacheDirectory) {
    throw new Error(
      "Failed to find directory to cache transcoded video files in. Make sure this loader is being used in a project which has a package.json file and node_modules directory."
    );
  }

  const tempCacheFilePath = path.resolve(cacheDirectory, transcodedFileName);

  // Cached video files will be gzipped in an effort to save additional space, so add an additional `.gz` extension to denote that
  const compressedCacheFilePath = `${tempCacheFilePath}.gz`;

  let isCached = true;

  try {
    await fsPromises.access(compressedCacheFilePath);
  } catch (err) {
    // If an error was thrown while trying to access the cached file, that means it either doesn't exist
    // or something is messed up so we couldn't access it anyways, so mark that the file is not cached
    isCached = false;
  }

  if (isCached) {
    const cachedCompressedFileData = await fsPromises.readFile(
      compressedCacheFilePath
    );

    const unzippedData = await gunzip(cachedCompressedFileData);
    emitFile(outputFilePath, unzippedData);

    return {
      filePath: outputFileSrc,
      fileName: transcodedFileName,
      mimeType,
      fileSize: Buffer.byteLength(unzippedData),
    };
  }

  const audioCodec =
    outputFileConfig.audioCodec || videoContainerConfig.defaultAudioCodec;

  if (!videoContainerConfig.supportedAudioCodecs.includes(audioCodec)) {
    throw new Error(
      `Video container "${videoContainerName}" does not support audio codec "${audioCodec}"`
    );
  }

  return new Promise((resolve, reject) => {
    let ffmpegChain: ffmpeg.FfmpegCommand = ffmpeg(originalFilePath)
      .format(videoContainerName)
      .videoCodec(videoCodecConfig.ffmpegCodecString);

    if (videoCodecName === VideoCodecName.h_265) {
      // https://aaron.cc/ffmpeg-hevc-apple-devices/
      ffmpegChain = ffmpegChain.addOption("-tag:v hvc1");
    }

    const videoQuality = outputFileConfig.videoQuality || "default";

    if (videoQuality !== "default") {
      // https://slhck.info/video/2017/02/24/crf-guide.html
      ffmpegChain = ffmpegChain.addOption(`-crf ${videoQuality}`);
    }

    ffmpegChain = ffmpegChain.addOption(
      `-preset ${compressionEfficiencyPreset}`
    );

    if (audioCodec === AudioCodecName.muted) {
      // Drop any audio from the input if the output should be muted
      ffmpegChain = ffmpegChain.noAudio();
    } else {
      const audioCodecConfig = audioCodecs[audioCodec];
      const audioQuality = outputFileConfig.audioQuality || "default";

      ffmpegChain = ffmpegChain.audioCodec(audioCodecConfig.ffmpegCodecString);

      if (audioQuality !== "default") {
        ffmpegChain = ffmpegChain.addOption(
          `-${audioCodecConfig.qualityFfmpegCommandName} ${audioQuality}`
        );
      }
    }

    ffmpegChain
      .on("error", (err: Error, stdout: string, stderr: string) => {
        console.error(stderr);
        reject(err);
      })
      .on("end", async () => {
        const data = await fsPromises.readFile(tempCacheFilePath);
        emitFile(outputFilePath, data);

        const compressedData = await gzip(data);
        await fsPromises.writeFile(compressedCacheFilePath, compressedData);

        // Delete the temp file
        await fsPromises.unlink(tempCacheFilePath);

        resolve({
          filePath: outputFileSrc,
          fileName: transcodedFileName,
          mimeType,
          fileSize: Buffer.byteLength(data),
        });
      })
      .save(tempCacheFilePath);
  });
}
