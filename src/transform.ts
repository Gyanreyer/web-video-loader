import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import fs from "fs";

import { VideoTranscodeConfig } from "./constants/types";
import videoCodecs from "./constants/videoCodecs";
import videoContainers from "./constants/videoContainers";
import audioCodecs from "./constants/audioCodecs";
import { getCachedFileData, writeToCache } from "./utils/cache";
import { getOutputFileName, getCacheFileName } from "./utils/fileName";
import { getTargetBitrateForVideoResolution } from "./utils/targetBitRate";
import {
  getFfprobeDataFromReadStream,
  getStreamsFromFfprobeData,
} from "./utils/videoData";

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

  const cacheFileName = getCacheFileName(
    fileHash,
    videoContainerConfig.fileExtension
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
      const outputFileName = await getOutputFileName(
        fileNameTemplate,
        fileHash,
        inputFilePath,
        videoContainerConfig.fileExtension,
        cachedData
      );

      return {
        fileName: outputFileName,
        cacheFileName,
        mimeType,
        videoDataBuffer: cachedData,
      };
    }
  }

  const inputFileReadStream: fs.ReadStream = fs.createReadStream(inputFilePath);

  // Read in data on the input video file with ffprobe; this will help inform the settings we use for transcoding
  const inputVideoFileData = await getFfprobeDataFromReadStream(
    inputFileReadStream
  );

  const { videoStream: inputVideoStream, audioStream: inputAudioStream } =
    await getStreamsFromFfprobeData(inputVideoFileData);

  if (!inputVideoStream) {
    throw new Error(
      `web-video-loader: Could not find a video stream for file "${inputFilePath}"`
    );
  }

  let transcodeFfmpegCommand = ffmpeg(inputFilePath)
    .format(videoContainerName)
    // Apply any additional ffmpeg options needed for the video container
    .addOptions(videoContainerConfig.ffmpegOptions)
    .videoCodec(videoCodecConfig.ffmpegCodecString)
    // Apply any additional ffmpeg options needed for the video codec
    .addOptions(videoCodecConfig.ffmepgOptions);

  if (videoCodecName === "vp8") {
    // If we have a webm container, add a target bitrate option
    const inputVideoFileWidth = Number(inputVideoStream.width);
    const inputVideoFileHeight = Number(inputVideoStream.height);

    const targetBitrate = getTargetBitrateForVideoResolution(
      inputVideoFileWidth,
      inputVideoFileHeight,
      Number(inputVideoStream.avg_frame_rate) > 40
    );

    transcodeFfmpegCommand = transcodeFfmpegCommand.addOption(
      `-b:v ${targetBitrate}M`
    );
  }

  if (transcodeConfig.size) {
    transcodeFfmpegCommand = transcodeFfmpegCommand.size(transcodeConfig.size);
  }

  if (isMuted || !inputAudioStream) {
    // Drop any audio from the input if the output should be muted
    transcodeFfmpegCommand = transcodeFfmpegCommand.noAudio();
  } else {
    const audioCodecConfig = audioCodecs[audioCodecName];
    transcodeFfmpegCommand = transcodeFfmpegCommand.audioCodec(
      audioCodecConfig.ffmpegCodecString
    );
  }

  return new Promise((resolve, reject) => {
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

      const outputFileName = await getOutputFileName(
        fileNameTemplate,
        fileHash,
        inputFilePath,
        videoContainerConfig.fileExtension,
        outputBuffer
      );

      resolve({
        fileName: outputFileName,
        cacheFileName: shouldCache ? cacheFileName : null,
        mimeType,
        videoDataBuffer: outputBuffer,
      });
    });

    transcodeFfmpegCommand
      .on("error", (err: Error, stdout: string, stderr: string) => {
        console.error(
          `web-video-loader: an ffmpeg error occurred while transcoding ${inputFilePath}:`,
          stderr
        );
        reject(err);
      })
      .writeToStream(streamBuffer);
  });
}
