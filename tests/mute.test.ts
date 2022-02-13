import path from "path";
import ffmpeg from "fluent-ffmpeg";

import compiler from "./compiler";
import { Readable } from "stream";

test("audio is removed from the output video if the mute option is true", async () => {
  const { compilePromise, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "[originalFileName]-[audioCodec]",
    outputFiles: [
      {
        container: "mp4",
      },
    ],
    mute: true,
  });

  const compiledStats = await compilePromise;

  const videoFileBuffer = fsVolume.readFileSync(
    path.resolve(__dirname, "dist", "BigBuckBunny-muted.mp4")
  );

  const readableStreamBuffer = Readable.from(videoFileBuffer);

  const outputVideoFileMetadata: ffmpeg.FfprobeData = await new Promise(
    (resolve, reject) => {
      ffmpeg(readableStreamBuffer).ffprobe((err, metadata) => {
        if (err) {
          reject(err);
        }

        resolve(metadata);
      });
    }
  );

  // The video file should only have a video stream
  expect(outputVideoFileMetadata.streams).toHaveLength(1);
  expect(outputVideoFileMetadata.streams[0].codec_type).toBe("video");

  const output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny-muted.mp4","type":"video/mp4"}] };`
  );
});

test("if the input video has no audio track, the output will still not have audio even if the muted option is false", async () => {
  const { compilePromise, fsVolume } = await compiler(
    "./BigBuckBunny-muted.mp4",
    {
      fileNameTemplate: "[originalFileName]-[audioCodec]",
      outputFiles: [
        {
          container: "mp4",
        },
      ],
      mute: false,
    }
  );

  const compiledStats = await compilePromise;

  const videoFileBuffer = fsVolume.readFileSync(
    path.resolve(__dirname, "dist", "BigBuckBunny-muted-aac.mp4")
  );

  const readableStreamBuffer = Readable.from(videoFileBuffer);

  const outputVideoFileMetadata: ffmpeg.FfprobeData = await new Promise(
    (resolve, reject) => {
      ffmpeg(readableStreamBuffer).ffprobe((err, metadata) => {
        if (err) {
          reject(err);
        }

        resolve(metadata);
      });
    }
  );

  // The video file should only have a video stream
  expect(outputVideoFileMetadata.streams).toHaveLength(1);
  expect(outputVideoFileMetadata.streams[0].codec_type).toBe("video");

  const output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny-muted-aac.mp4","type":"video/mp4"}] };`
  );
});

test("if muted is false and the input video has audio, the output video will have an audio track", async () => {
  const { compilePromise, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "[originalFileName]-[audioCodec]",
    outputFiles: [
      {
        container: "mp4",
      },
    ],
    mute: false,
  });

  const compiledStats = await compilePromise;

  const videoFileBuffer = fsVolume.readFileSync(
    path.resolve(__dirname, "dist", "BigBuckBunny-aac.mp4")
  );

  const readableStreamBuffer = Readable.from(videoFileBuffer);

  const outputVideoFileMetadata: ffmpeg.FfprobeData = await new Promise(
    (resolve, reject) => {
      ffmpeg(readableStreamBuffer).ffprobe((err, metadata) => {
        if (err) {
          reject(err);
        }

        resolve(metadata);
      });
    }
  );

  // The video file should have both video and audio streams
  expect(outputVideoFileMetadata.streams).toHaveLength(2);
  expect(outputVideoFileMetadata.streams[0].codec_type).toBe("video");
  expect(outputVideoFileMetadata.streams[1].codec_type).toBe("audio");

  const output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny-aac.mp4","type":"video/mp4"}] };`
  );
});
