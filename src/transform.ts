import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import ffmpeg, { setFfmpegPath } from "fluent-ffmpeg";

import { VideoTranscodeConfig } from "./constants/types";
import videoCodecs from "./constants/videoCodecs";
import videoContainers from "./constants/videoContainers";
import audioCodecs from "./constants/audioCodecs";
import { getCachedFileData, writeToCache } from "./cache";
import { getFileNamesForVideo } from "./fileName";
import { PassThrough } from "stream";

setFfmpegPath(ffmpegPath);

export default async function transform(
  inputFilePath: string,
  fileHash: string,
  fileNameTemplate: string,
  transcodeConfig: VideoTranscodeConfig
): Promise<{
  fileName: string;
  cacheFileName: string | null;
  mimeType: string;
  videoDataBuffer: Buffer;
}> {
  const videoContainerName = transcodeConfig.container;
  const videoContainerConfig = videoContainers[videoContainerName];

  const videoCodecName =
    transcodeConfig.videoCodec || videoContainerConfig.defaultVideoCodec;
  const videoCodecConfig = videoCodecs[videoCodecName];

  const audioCodecName =
    transcodeConfig.audioCodec || videoContainerConfig.defaultAudioCodec;

  const isMuted = transcodeConfig.mute;

  const { outputFileName, cacheFileName } = getFileNamesForVideo(
    fileNameTemplate,
    fileHash,
    inputFilePath,
    videoContainerConfig.fileExtension,
    videoCodecName,
    isMuted ? "muted" : audioCodecName
  );

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

  // If caching is enabled, check if we have the video file in our cache already and
  // if it is, just use that rather than making a new one
  if (transcodeConfig.cache) {
    const cachedData = await getCachedFileData(cacheFileName);

    if (cachedData) {
      return {
        fileName: outputFileName,
        cacheFileName,
        mimeType,
        videoDataBuffer: cachedData,
      };
    }
  }

  return new Promise((resolve, reject) => {
    let ffmpegCommand = ffmpeg(inputFilePath)
      .format(videoContainerName)
      .videoCodec(videoCodecConfig.ffmpegCodecString);

    // Apply any additional ffmpeg options needed for the video codec
    if (videoCodecConfig.additonalFfmpegOptions) {
      ffmpegCommand = ffmpegCommand.addOptions(
        videoCodecConfig.additonalFfmpegOptions
      );
    }

    if (transcodeConfig.size) {
      ffmpegCommand = ffmpegCommand.size(transcodeConfig.size);
    }

    if (isMuted) {
      // Drop any audio from the input if the output should be muted
      ffmpegCommand = ffmpegCommand.noAudio();
    } else {
      const audioCodecConfig = audioCodecs[audioCodecName];
      ffmpegCommand = ffmpegCommand.audioCodec(
        audioCodecConfig.ffmpegCodecString
      );
    }

    const streamBuffer = new PassThrough();

    const buffers: Buffer[] = [];
    streamBuffer.on("data", (buf: Buffer) => {
      buffers.push(buf);
    });
    streamBuffer.on("end", async () => {
      const outputBuffer = Buffer.concat(buffers);

      const shouldCache = transcodeConfig.cache;

      if (shouldCache) {
        await writeToCache(cacheFileName, outputBuffer);
      }

      resolve({
        fileName: outputFileName,
        cacheFileName: shouldCache ? cacheFileName : null,
        mimeType,
        videoDataBuffer: outputBuffer,
      });
    });

    ffmpegCommand
      .on("error", (err: Error, stdout: string, stderr: string) => {
        console.error(
          `An ffmpeg error occurred while transcoding ${outputFileName}:`,
          stderr
        );
        reject(err);
      })
      .writeToStream(streamBuffer);
  });
}
