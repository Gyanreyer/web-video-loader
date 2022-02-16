import path from "path";
import fs from "fs";

import compiler from "./compiler";
import { getFfprobeDataForVideoFile } from "./utils";

test("output videos are resized correctly if the size option is set", async () => {
  const inputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fs.createReadStream(path.resolve(__dirname, "BigBuckBunny.mp4"))
  );

  // The original input file should be 720x480
  expect(inputVideoFileMetadata.streams[0].width).toBe(720);
  expect(inputVideoFileMetadata.streams[0].height).toBe(480);

  let { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "[originalFileName]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    // size is null by default
  });
  expect(compiledStats?.modules?.[0].source).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny.mp4","type":"video/mp4"}] };`
  );

  let outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny.mp4")
    )
  );

  // The video should have the original file's dimensions
  expect(outputVideoFileMetadata.streams[0].width).toBe(720);
  expect(outputVideoFileMetadata.streams[0].height).toBe(480);

  // Re-compile with size set to 100x?, meaning it should have a width of 100 and an automatically calculated height to
  // retain its aspect ratio
  ({ compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "[originalFileName]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    size: "100x?",
  }));
  expect(compiledStats?.modules?.[0].source).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny.mp4","type":"video/mp4"}] };`
  );

  outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny.mp4")
    )
  );

  // The video should be 100x66
  expect(outputVideoFileMetadata.streams[0].width).toBe(100);
  expect(outputVideoFileMetadata.streams[0].height).toBe(66);

  // Re-compile with size set to 200x400, meaning it should have a width of 200 and a height of 400
  ({ compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "[originalFileName]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    size: "200x400",
  }));
  expect(compiledStats?.modules?.[0].source).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny.mp4","type":"video/mp4"}] };`
  );

  outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny.mp4")
    )
  );

  // The video should be 200x400
  expect(outputVideoFileMetadata.streams[0].width).toBe(200);
  expect(outputVideoFileMetadata.streams[0].height).toBe(400);

  // Re-compile with size set to 50%, meaning the dimensions should be
  // scaled down to half the size of the original file
  ({ compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "[originalFileName]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    size: "50%",
  }));
  expect(compiledStats?.modules?.[0].source).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny.mp4","type":"video/mp4"}] };`
  );

  outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny.mp4")
    )
  );

  // The video should be 360x240, half of the original file's 720x480 dimensions
  expect(outputVideoFileMetadata.streams[0].width).toBe(360);
  expect(outputVideoFileMetadata.streams[0].height).toBe(240);
});

test("setting the size option via a query param also works as expected", async () => {
  let { compiledStats, fsVolume } = await compiler(
    "./BigBuckBunny.mp4?size=90x?",
    {
      fileNameTemplate: "[originalFileName]",
      outputFormats: [
        {
          container: "mp4",
        },
      ],
    }
  );
  expect(compiledStats?.modules?.[0].source).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny.mp4","type":"video/mp4"}] };`
  );

  let outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny.mp4")
    )
  );

  // The video should be 90x60
  expect(outputVideoFileMetadata.streams[0].width).toBe(90);
  expect(outputVideoFileMetadata.streams[0].height).toBe(60);

  // Query params should override options in the webpack config
  ({ compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4?size=10%", {
    fileNameTemplate: "[originalFileName]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    size: "1920x1080",
  }));
  expect(compiledStats?.modules?.[0].source).toBe(
    `module.exports = { sources: [{"src":"/BigBuckBunny.mp4","type":"video/mp4"}] };`
  );

  outputVideoFileMetadata = await getFfprobeDataForVideoFile(
    fsVolume.createReadStream(
      path.resolve(__dirname, "dist", "BigBuckBunny.mp4")
    )
  );

  // The video should be 72x48, 10% of the original file's 720x480 dimensions
  expect(outputVideoFileMetadata.streams[0].width).toBe(72);
  expect(outputVideoFileMetadata.streams[0].height).toBe(48);
});
