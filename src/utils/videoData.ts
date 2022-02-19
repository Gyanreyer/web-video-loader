import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

export async function getFfprobeDataFromReadStream(
  videoReadStream: Readable
): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoReadStream).ffprobe((err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export async function getFfprobeDataFromBuffer(
  videoDataBuffer: Buffer
): Promise<ffmpeg.FfprobeData> {
  const readableVideoDataStream = new Readable();
  readableVideoDataStream.push(videoDataBuffer);
  readableVideoDataStream.push(null);

  return getFfprobeDataFromReadStream(readableVideoDataStream);
}

export async function getStreamsFromFfprobeData(
  ffprobeData: ffmpeg.FfprobeData
) {
  let videoStream: ffmpeg.FfprobeStream | null = null;
  let audioStream: ffmpeg.FfprobeStream | null = null;

  for (
    let i = 0, streamCount = ffprobeData.streams.length;
    i < streamCount;
    i += 1
  ) {
    const stream = ffprobeData.streams[i];
    switch (stream.codec_type) {
      case "video":
        videoStream = stream;
        break;
      case "audio":
        audioStream = stream;
        break;
      default:
    }
  }

  return {
    videoStream,
    audioStream,
  };
}
