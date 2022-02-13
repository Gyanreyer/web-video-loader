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

test("esModule option correctly changes whether the loader's output is in esmodule or commonjs format", async () => {
  let { compilePromise } = await compiler("./BigBuckBunny.mp4", {
    outputFiles: [
      {
        container: "mp4",
      },
    ],
    // esModule is false by default
  });

  let compiledStats = await compilePromise;
  let output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    // The output should be in commonjs format
    `module.exports = { sources: [{"src":"/videoName.mp4","type":"video/mp4"}] };`
  );

  ({ compilePromise } = await compiler("./BigBuckBunny.mp4", {
    outputFiles: [
      {
        container: "mp4",
      },
    ],
    esModule: true,
  }));

  compiledStats = await compilePromise;
  output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    // The output should be in esmodule format
    `export default { sources: [{"src":"/videoName.mp4","type":"video/mp4"}] };`
  );

  // Setting the option via a query param also works
  ({ compilePromise } = await compiler("./BigBuckBunny.mp4?esModule", {
    outputFiles: [
      {
        container: "mp4",
      },
    ],
  }));

  compiledStats = await compilePromise;
  output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    // The output should be in esmodule format
    `export default { sources: [{"src":"/videoName.mp4","type":"video/mp4"}] };`
  );

  // Setting the option via a query param overrides whatever is set in the webpack config
  ({ compilePromise } = await compiler("./BigBuckBunny.mp4?esModule=false", {
    outputFiles: [
      {
        container: "mp4",
      },
    ],
    esModule: true,
  }));

  compiledStats = await compilePromise;
  output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    // The output should be in commonjs format because the esModule=false query param take precedence
    `module.exports = { sources: [{"src":"/videoName.mp4","type":"video/mp4"}] };`
  );
});
