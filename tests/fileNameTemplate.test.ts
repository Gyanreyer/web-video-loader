/**
 * @jest-environment node
 */
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

import compiler from "./compiler";

test("ouput file names are constructed correctly from the fileNameTemplate option", async () => {
  const stats = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate:
      "[hash]--[originalFileName]__[videoCodec]x[audioCodec]+[originalFileName]",
    outputFiles: [
      {
        container: "mp4",
      },
    ],
  });
  const output = stats?.toJson({ source: true }).modules?.[0].source;

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

  expect(output).toBe(
    `module.exports = { sources: [{"src":"/${expectedFileHash}--BigBuckBunny__h_264xaac+BigBuckBunny.mp4","type":"video/mp4"}] };`
  );
});
