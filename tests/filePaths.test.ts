import path from "path";

import compiler from "./compiler";

// Mocking the transform method because it doesn't have any bearing on the functionality
// we're testing
jest.mock(
  "../dist/transform.js",
  () =>
    async function transform() {
      return {
        fileName: "videoName.mp4",
        mimeType: "video/mp4",
        videoDataBuffer: Buffer.from("hello"),
      };
    }
);

test("ouputPath option correctly defines the path that transcoded video files will be output to", async () => {
  const { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    outputPath: "/the/video/goes/here",
  });

  const doesFileExist = fsVolume.existsSync(
    path.resolve(__dirname, "dist", "the/video/goes/here/videoName.mp4")
  );
  expect(doesFileExist).toBe(true);

  const output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    `module.exports = { sources: [{"src":"/the/video/goes/here/videoName.mp4","type":"video/mp4"}] };`
  );
});

test("publicPath option is used correctly in the output src path", async () => {
  const { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    outputPath: "/the/video/goes/here",
    publicPath: "/videos/",
  });

  const doesFileExist = fsVolume.existsSync(
    path.resolve(__dirname, "dist", "the/video/goes/here/videoName.mp4")
  );
  expect(doesFileExist).toBe(true);

  const output = compiledStats?.modules?.[0].source;
  expect(output).toBe(
    `module.exports = { sources: [{"src":"/videos/videoName.mp4","type":"video/mp4"}] };`
  );
});

test("When only the publicPath option is set, the file's output path is not affected", async () => {
  const { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    publicPath: "/videos/",
  });

  const doesFileExist = fsVolume.existsSync(
    path.resolve(__dirname, "dist", "videoName.mp4")
  );
  expect(doesFileExist).toBe(true);

  const output = compiledStats?.modules?.[0].source;
  expect(output).toBe(
    `module.exports = { sources: [{"src":"/videos/videoName.mp4","type":"video/mp4"}] };`
  );
});
