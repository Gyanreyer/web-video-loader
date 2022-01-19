import type { LoaderContext } from "webpack";

import {
  CompressionEfficiencyPreset,
  OutputFileConfig,
  VideoCodecName,
  VideoContainerName,
  Options,
} from "./types";
import transform from "./transform";
import { cleanUpCache } from "./cache";

const DEFAULT_OPTIONS: Options = {
  outputFiles: [
    {
      container: VideoContainerName.mp4,
      videoCodec: VideoCodecName.h_264,
    },
    {
      container: VideoContainerName.webm,
      videoCodec: VideoCodecName.vp9,
    },
  ],
  compressionSpeed: CompressionEfficiencyPreset.medium,
  outputPath: "/",
};

export default async function loader(this: LoaderContext<Options>) {
  const loaderCallback = this.async();

  const resourceQueryOptionsParams = new URLSearchParams(this.resourceQuery);

  const parsedResourceQueryOptions: Options = {};
  const queryOptionOutputFiles: OutputFileConfig[] | undefined =
    resourceQueryOptionsParams
      .get("outputfiles")
      ?.split(",")
      .map((rawOutputFilestring) => JSON.parse(rawOutputFilestring));

  if (
    queryOptionOutputFiles &&
    Array.isArray(queryOptionOutputFiles) &&
    queryOptionOutputFiles.length > 0
  ) {
    parsedResourceQueryOptions.outputFiles = queryOptionOutputFiles;
  }

  const options: Options = {
    ...DEFAULT_OPTIONS,
    ...this.getOptions(),
    ...parsedResourceQueryOptions,
  };

  if (
    !options.outputFiles ||
    !Array.isArray(options.outputFiles) ||
    options.outputFiles.length === 0
  ) {
    return loaderCallback(
      new Error("No valid output files provided for transcoding")
    );
  }

  const { compressionSpeed } = options;

  if (!compressionSpeed || !CompressionEfficiencyPreset[compressionSpeed]) {
    return loaderCallback(
      new Error("Invalid compressionSpeed provided for transcoding")
    );
  }

  const { outputPath } = options;

  if (typeof outputPath !== "string") {
    return loaderCallback(
      new Error("web-video-loader received invalid `outputPath` option")
    );
  }

  const publicPath = options.publicPath || outputPath;

  if (typeof publicPath !== "string") {
    return loaderCallback(
      new Error("web-video-loader received invalid `publicPath` option")
    );
  }

  try {
    const transcodedFiles = await Promise.all(
      options.outputFiles.map((outputFileConfig) =>
        transform(
          this.resourcePath,
          outputPath,
          publicPath,
          outputFileConfig,
          compressionSpeed,
          this.emitFile
        )
      )
    );

    // Clear out any files from the cache which weren't used in an effort to save storage space and
    // avoid things getting bloated out of control
    await cleanUpCache(transcodedFiles.map(({ fileName }) => fileName));

    // Sort the files by size from smallest -> largest
    const filesSortedBySize = transcodedFiles.sort(
      (fileWithSize1, fileWithSize2) =>
        fileWithSize1.fileSize - fileWithSize2.fileSize
    );

    const videoSourceOutput = filesSortedBySize.map(
      ({ filePath, mimeType }) => ({ src: filePath, type: mimeType })
    );

    loaderCallback(
      null,
      `export default { sources: ${JSON.stringify(videoSourceOutput)} };`
    );
  } catch (err) {
    loaderCallback(err as Error);
  }
}
