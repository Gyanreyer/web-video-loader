import ffmpeg from "fluent-ffmpeg";

import { IReadStream } from "memfs/lib/volume";
import { ReadStream } from "fs";

export async function getFfprobeDataForVideoFile(
  videoStream: IReadStream | ReadStream
): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoStream).ffprobe((err, metadata) => {
      if (err) {
        reject(err);
      }

      resolve(metadata);
    });
  });
}
