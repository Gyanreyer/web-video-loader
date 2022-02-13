import type { LoaderContext } from "webpack";
import path from "path";

import transform from "./transform";
import { cleanUpCache } from "./cache";
import { getFileHash } from "./fileName";
import parseOptions from "./options";

export default async function loader(
  this: LoaderContext<unknown>,
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
        async ({
          transcodeConfig,
          outputPath,
          publicPath,
          fileNameTemplate,
        }) => {
          // Get unique hash string to use for the name of the video file we're going to output
          const fileHash = getFileHash(source, transcodeConfig);

          const { fileName, mimeType, videoDataBuffer } = await transform(
            inputFilePath,
            fileHash,
            fileNameTemplate,
            transcodeConfig
          );

          // File path that the video will be stored at; this path is relative to the webpack output directory,
          // so if the output directory is `./dist` and the `outputDirectory` is set to `assets/videos`, the video files
          // will end up being created in `./dist/assets/videos`
          const outputFilePath = path.join(outputPath, fileName);
          this.emitFile(outputFilePath, videoDataBuffer);

          // URL path which the video file can be loaded from via an `src` attribute in the app
          const outputFileSrc = `${publicPath}${
            publicPath.endsWith("/") ? "" : "/"
          }${fileName}`;

          return {
            src: outputFileSrc,
            type: mimeType,
            fileName,
            fileSize: Buffer.byteLength(videoDataBuffer),
          };
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

    // Our final output should only include the src and type properties
    const videoSourceOutput = filesSortedBySize.map(({ src, type }) => ({
      src,
      type,
    }));

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
