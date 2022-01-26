import type { LoaderContext } from "webpack";

import { InputOptions } from "./types";
import transform from "./transform";
import { cleanUpCache } from "./cache";
import { getFileHash } from "./fileName";
import parseOptions from "./options";

export default async function loader(
  this: LoaderContext<InputOptions>,
  source: string
) {
  const loaderCallback = this.async();

  const { transformConfigs, esModule } = parseOptions(
    this.getOptions(),
    this.resourceQuery
  );

  const inputFilePath = this.resourcePath;

  try {
    const transcodedFiles = await Promise.all(
      transformConfigs.map(
        ({ transcodeConfig, outputPath, publicPath, fileNameTemplate }) => {
          // Get unique hash string to use for the name of the video file we're going to output
          const fileHash = getFileHash(source, transcodeConfig);

          return transform(
            inputFilePath,
            fileHash,
            fileNameTemplate,
            outputPath,
            publicPath,
            transcodeConfig,
            this.emitFile
          );
        }
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
      `${
        esModule ? "export default" : "module.exports ="
      } { sources: ${JSON.stringify(videoSourceOutput)} };`
    );
  } catch (err) {
    loaderCallback(err as Error);
  }
}
