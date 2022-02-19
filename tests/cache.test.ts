import { createHash } from "crypto";
import fs from "fs";
import path from "path";

import compiler from "./compiler";

let getCachedFileDataSpy: jest.SpyInstance;

jest.mock("../dist/cache.js", () => {
  const original = jest.requireActual("../dist/cache.js");

  getCachedFileDataSpy = jest.spyOn(original, "getCachedFileData");

  return original;
});

afterEach(() => {
  getCachedFileDataSpy.mockClear();
});

test("output video files are cached correctly when the cache option is enabled", async () => {
  let { fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "output",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
  });

  // getCachedFileData should have returned null because the file doesn't initially exist in the cache
  expect(getCachedFileDataSpy).toHaveBeenCalledTimes(1);
  const firstGetCachedFileDataCallReturnValue = await getCachedFileDataSpy.mock
    .results[0].value;
  expect(firstGetCachedFileDataCallReturnValue).toBe(null);

  const initialCreatedFile = fsVolume.readFileSync(
    path.resolve(__dirname, "dist", "output.mp4")
  );

  // Re-run with exact same file output config
  ({ fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "output",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
  }));

  // getCachedFileData should have resolved with data from the cache since we've already created a file with this exact config
  expect(getCachedFileDataSpy).toHaveBeenCalledTimes(2);
  const secondGetCachedFileDataCallReturnValue = await getCachedFileDataSpy.mock
    .results[1].value;
  expect(secondGetCachedFileDataCallReturnValue).toEqual(initialCreatedFile);

  const secondCreatedFile = fsVolume.readFileSync(
    path.resolve(__dirname, "dist", "output.mp4")
  );

  expect(initialCreatedFile).toEqual(secondCreatedFile);
});

test("the cache is invalidated if the file output config changes", async () => {
  // Create a hash based on what we expect the ouput video's configuration will be
  const fileContentsString = fs
    .readFileSync(path.resolve(__dirname, "BigBuckBunny.mp4"))
    .toString();

  let { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "output-[hash]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    // cache is true by default
  });

  // getCachedFileData should have returned null because the file doesn't initially exist in the cache
  expect(getCachedFileDataSpy).toHaveBeenCalledTimes(1);
  const firstGetCachedFileDataCallReturnValue = await getCachedFileDataSpy.mock
    .results[0].value;
  expect(firstGetCachedFileDataCallReturnValue).toBe(null);

  const expectedFileHash1 = createHash("shake256", { outputLength: 20 })
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

  let output = compiledStats?.modules?.[0].source;
  expect(output).toBe(
    `module.exports = { sources: [{"src":"/output-${expectedFileHash1}.mp4","type":"video/mp4"}] };`
  );

  // The file we just created should be the only file in the cache
  expect(
    fs.readdirSync(
      path.resolve(__dirname, "../node_modules/.cache/web-video-loader")
    )
  ).toEqual([`${expectedFileHash1}.mp4.gz`]);

  const initialCreatedFile = fsVolume.readFileSync(
    path.resolve(__dirname, "dist", `output-${expectedFileHash1}.mp4`)
  );

  ({ compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "output-[hash]",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    mute: true,
    // cache is true by default
  }));

  // getCachedFileData should have returned null again because the cache is invalidated
  expect(getCachedFileDataSpy).toHaveBeenCalledTimes(2);
  const secondGetCachedFileDataCallReturnValue = await getCachedFileDataSpy.mock
    .results[1].value;
  expect(secondGetCachedFileDataCallReturnValue).toBe(null);

  const expectedFileHash2 = createHash("shake256", { outputLength: 20 })
    .update(fileContentsString)
    .update(
      JSON.stringify({
        container: "mp4",
        videoCodec: "h.264",
        audioCodec: "aac",
        mute: true,
        size: null,
        cache: true,
      })
    )
    .digest("hex");

  // The hashes should be different
  expect(expectedFileHash1).not.toBe(expectedFileHash2);

  output = compiledStats?.modules?.[0].source;
  expect(output).toBe(
    `module.exports = { sources: [{"src":"/output-${expectedFileHash2}.mp4","type":"video/mp4"}] };`
  );

  // The first output file should no longer be in the cache, but the second file should
  expect(
    fs.readdirSync(
      path.resolve(__dirname, "../node_modules/.cache/web-video-loader")
    )
  ).toEqual([`${expectedFileHash2}.mp4.gz`]);

  // The created files should be different
  const secondCreatedFile = fsVolume.readFileSync(
    path.resolve(__dirname, "dist", `output-${expectedFileHash2}.mp4`)
  );
  expect(secondCreatedFile).not.toEqual(initialCreatedFile);
});

test("output files are not cached if the cache option is false", async () => {
  let { compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "output",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    cache: false,
  });

  expect(getCachedFileDataSpy).not.toHaveBeenCalled();

  // The file should exist
  expect(
    fsVolume.existsSync(path.resolve(__dirname, "dist", "output.mp4"))
  ).toBe(true);

  // Nothing should be in the cache
  expect(
    fs.readdirSync(
      path.resolve(__dirname, "../node_modules/.cache/web-video-loader")
    )
  ).toEqual([]);

  ({ compiledStats, fsVolume } = await compiler("./BigBuckBunny.mp4", {
    fileNameTemplate: "output",
    outputFormats: [
      {
        container: "mp4",
      },
    ],
    cache: false,
  }));

  expect(getCachedFileDataSpy).not.toHaveBeenCalled();

  // The file should exist
  expect(
    fsVolume.existsSync(path.resolve(__dirname, "dist", "output.mp4"))
  ).toBe(true);

  // Nothing should be in the cache
  expect(
    fs.readdirSync(
      path.resolve(__dirname, "../node_modules/.cache/web-video-loader")
    )
  ).toEqual([]);
});
