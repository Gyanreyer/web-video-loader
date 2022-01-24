import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import ffmpeg, { setFfmpegPath } from "fluent-ffmpeg";
import type { LoaderContext } from "webpack";
import { promises as fsPromises } from "fs";
import path from "path";

import {
  VideoCodecName,
  AudioCodecName,
  VideoTranscodeConfig,
  InputOptions,
} from "./types";
import videoCodecs from "./videoCodecs";
import videoContainers from "./videoContainers";
import audioCodecs from "./audioCodecs";
import { getCachedFileData, writeToCache, cacheDirectory } from "./cache";

setFfmpegPath(ffmpegPath);

export default async function transform(
  inputFilePath: string,
  fileHash: string,
  outputDirectory: string,
  publicPath: string,
  transcodeConfig: VideoTranscodeConfig,
  emitFile: LoaderContext<InputOptions>["emitFile"]
): Promise<{
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}> {
  const videoContainerName = transcodeConfig.container;
  const videoContainerConfig = videoContainers[videoContainerName];

  const videoCodecName =
    transcodeConfig.videoCodec || videoContainerConfig.defaultVideoCodec;
  const videoCodecConfig = videoCodecs[videoCodecName];

  // The output file name will be the hash + the appropriate extension for the selected container (ie, ".mp4", ".webm")
  const outputFileName = `${fileHash}.${videoContainerConfig.fileExtension}`;
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
  const outputFilePath = path.join(outputDirectory, outputFileName);

  // File path which we'll temporarily use while ffmpeg is encoding the video file; once everything is done,
  // we'll delete this file
  const tempOutputFilePath = path.join(cacheDirectory, outputFileName);

  // URL path which the video file can be loaded from via an `src` attribute in the app
  const outputFileSrc = `${publicPath}${
    publicPath.endsWith("/") ? "" : "/"
  }${outputFileName}`;

  // If caching is enabled, check if we have the video file in our cache already and
  // if it is, just use that rather than making a new one
  if (transcodeConfig.cache) {
    const cachedData = await getCachedFileData(outputFileName);

    if (cachedData) {
      emitFile(outputFilePath, cachedData);
      return {
        filePath: outputFileSrc,
        fileName: outputFileName,
        mimeType,
        fileSize: Buffer.byteLength(cachedData),
      };
    }
  }

  const audioCodec =
    transcodeConfig.audioCodec || videoContainerConfig.defaultAudioCodec;

  if (!videoContainerConfig.supportedAudioCodecs.includes(audioCodec)) {
    throw new Error(
      `Video container "${videoContainerName}" does not support audio codec "${audioCodec}"`
    );
  }

  return new Promise((resolve, reject) => {
    let ffmpegChain = ffmpeg(inputFilePath)
      .format(videoContainerName)
      .videoCodec(videoCodecConfig.ffmpegCodecString);

    // Apply any additional ffmpeg options needed for the video codec
    if (videoCodecConfig.additonalFfmpegOptions) {
      videoCodecConfig.additonalFfmpegOptions.forEach((ffmpegOption) => {
        ffmpegChain = ffmpegChain.addOption(ffmpegOption);
      });
    }

    const videoQuality = transcodeConfig.videoQuality || "default";

    if (videoQuality !== "default") {
      // https://slhck.info/video/2017/02/24/crf-guide.html
      ffmpegChain = ffmpegChain.addOption(`-crf ${videoQuality}`);
    }

    if (transcodeConfig.size) {
      ffmpegChain = ffmpegChain.size(transcodeConfig.size);
    }

    ffmpegChain = ffmpegChain.addOption(
      `-preset ${transcodeConfig.compressionSpeed}`
    );

    if (audioCodec === AudioCodecName.muted) {
      // Drop any audio from the input if the output should be muted
      ffmpegChain = ffmpegChain.noAudio();
    } else {
      const audioCodecConfig = audioCodecs[audioCodec];
      const audioQuality = transcodeConfig.audioQuality || "default";

      ffmpegChain = ffmpegChain.audioCodec(audioCodecConfig.ffmpegCodecString);

      if (audioQuality !== "default") {
        ffmpegChain = ffmpegChain.addOption(
          `-${audioCodecConfig.qualityFfmpegCommandName} ${audioQuality}`
        );
      }
    }

    ffmpegChain
      .on("error", (err: Error, stdout: string, stderr: string) => {
        console.error(
          `An ffmpeg error occurred while transcoding ${outputFileName}:`,
          stderr
        );
        reject(err);
      })
      .on("end", async () => {
        const data = await fsPromises.readFile(tempOutputFilePath);
        emitFile(outputFilePath, data);

        if (transcodeConfig.cache) {
          await writeToCache(outputFileName, data);
        }

        // Delete the temp file
        await fsPromises.unlink(tempOutputFilePath);

        resolve({
          filePath: outputFileSrc,
          fileName: outputFileName,
          mimeType,
          fileSize: Buffer.byteLength(data),
        });
      })
      .save(tempOutputFilePath);
  });
}
