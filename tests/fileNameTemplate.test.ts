import { createHash } from "crypto";
import fs from "fs";
import path from "path";

import compiler from "./compiler";

test("output file names are constructed correctly from the fileNameTemplate option", async () => {
  // Create a hash based on what we expect the ouput video's configuration will be
  const fileContentsString = fs
    .readFileSync(path.resolve(__dirname, "BigBuckBunny.mp4"))
    .toString();
  const expectedFileHash = createHash("shake256", { outputLength: 20 })
    .update(fileContentsString)
    .update(
      JSON.stringify({
        container: "mp4",
        videoCodec: "h.264",
        audioCodec: "aac",
        mute: false,
        size: null,
        cache: true,
      })
    )
    .digest("hex");

  let { compilePromise, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate:
      "[hash]--[originalFileName]__[videoCodec]x[audioCodec]+[originalFileName]",
    outputFiles: [
      {
        container: "mp4",
      },
    ],
  });

  let expectedFileName = `${expectedFileHash}--BigBuckBunny__h_264xaac+BigBuckBunny.mp4`;

  let compiledStats = await compilePromise;
  let output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    `module.exports = { sources: [{"src":"/${expectedFileName}","type":"video/mp4"}] };`
  );

  // A file should have been created with the correct name
  let doesFileExist = fsVolume.existsSync(
    path.resolve(__dirname, "dist", expectedFileName)
  );
  expect(doesFileExist).toBe(true);

  // Setting fileNameTemplate option via query param also works
  ({ compilePromise, fsVolume } = await compiler(
    "./BigBuckBunny.mp4?fileNameTemplate=my_video_[originalFileName]",
    {
      outputFiles: [
        {
          container: "mp4",
        },
      ],
    }
  ));

  expectedFileName = `my_video_BigBuckBunny.mp4`;

  compiledStats = await compilePromise;
  output = compiledStats?.modules?.[0].source;

  expect(output).toBe(
    `module.exports = { sources: [{"src":"/${expectedFileName}","type":"video/mp4"}] };`
  );

  // A file should have been created with the correct name
  doesFileExist = fsVolume.existsSync(
    path.resolve(__dirname, "dist", expectedFileName)
  );
  expect(doesFileExist).toBe(true);
});
