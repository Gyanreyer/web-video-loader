import { rejects } from "assert";
import path from "path";

import compiler from "./compiler";
import { getFfprobeDataForVideoFile } from "./utils";

test("audio is removed from the output video if the mute option is true", async () => {
  const { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "[originalFileName]-[audioCodec]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    mute: true,
  });

  const outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny-muted.mp4")
    )
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
  const { compiledStats, fsVolume } = await compiler(
    "./BigBuckBunny-muted.mp4",
    {
      fileNameTemplate: "[originalFileName]-[audioCodec]",
      outputFormats: [
        {
          container: "mp4",
        },
      ],
      mute: false,
    }
  );

  const outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny-muted-muted.mp4")
    )
  );

  // The video file should only have a video stream
  expect(outputVideoFileMetadata.streams).toHaveLength(1);
  expect(outputVideoFileMetadata.streams[0].codec_type).toBe("video");

  const output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny-muted-muted.mp4","type":"video/mp4"}] };`
  );
});

test("if muted is false and the input video has audio, the output video will have an audio track", async () => {
  const { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "[originalFileName]-[audioCodec]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    mute: false,
  });

  const outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny-aac.mp4")
    )
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

test("setting the mute option via query param also works", async () => {
  let { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4?mute", {
    fileNameTemplate: "[originalFileName]-[audioCodec]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
  });

  let outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny-muted.mp4")
    )
  );

  // The video file should only have a video stream
  expect(outputVideoFileMetadata.streams).toHaveLength(1);
  expect(outputVideoFileMetadata.streams[0].codec_type).toBe("video");

  expect(compiledStats?.modules?.[0].source).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny-muted.mp4","type":"video/mp4"}] };`
  );

  ({ compiledStats, fsVolume } = await compiler(
    "./BigBuckBunny.mp4?mute=false",
    {
      fileNameTemplate: "[originalFileName]-[audioCodec]",
      outputFormats: [
        {
          container: "mp4",
        },
      ],
      mute: true,
    }
  ));

  outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny-aac.mp4")
    )
  );

  // The video file should have an audio stream
  expect(outputVideoFileMetadata.streams).toHaveLength(2);
  expect(outputVideoFileMetadata.streams[1].codec_type).toBe("audio");

  expect(compiledStats?.modules?.[0].source).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny-aac.mp4","type":"video/mp4"}] };`
  );
});

test("explicitly set audio codecs are ignored if the mute option is true", async () => {
  const { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "[originalFileName]-[audioCodec]",
    outputFormats: [
      {
        container: "mp4",
        audioCodec: "aac",
      },
    ],
    mute: true,
  });

  const outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny-muted.mp4")
    )
  );

  // The video file should only have a video stream
  expect(outputVideoFileMetadata.streams).toHaveLength(1);
  expect(outputVideoFileMetadata.streams[0].codec_type).toBe("video");

  expect(compiledStats?.modules?.[0].source).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny-muted.mp4","type":"video/mp4"}] };`
  );
});

test("providing an invalid value for the mute option throws a validation error", async () => {
  try {
    await compiler("./BigBuckBunny.mp4", {
      fileNameTemplate: "[originalFileName]-[audioCodec]",
      outputFormats: [
        {
          container: "mp4",
        },
      ],
      mute: 1234,
    });

    expect(true).toBe(false);
  } catch (errors) {
    expect((errors as Error[])[0].message).toContain(
      'web-video-loader received invalid value for option "mute": Expected boolean, received number'
    );
  }

  try {
    await compiler("./BigBuckBunny.mp4?mute=trueasdf", {
      fileNameTemplate: "[originalFileName]-[audioCodec]",
      outputFormats: [
        {
          container: "mp4",
        },
      ],
    });

    expect(true).toBe(false);
  } catch (errors) {
    expect((errors as Error[])[0].message).toContain(
      'web-video-loader received invalid query param option "mute=trueasdf": value is not a valid boolean'
    );
  }
});
