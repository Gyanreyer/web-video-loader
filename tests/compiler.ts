import path from "path";
import webpack from "webpack";
import { createFsFromVolume } from "memfs";
import { Volume } from "memfs/lib/volume";

export default function (
  fixture: string,
  options = {}
): {
  compilePromise: Promise<webpack.StatsCompilation>;
  fsVolume: Volume;
} {
  const compiler = webpack({
    context: __dirname,
    entry: `./${fixture}`,
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "bundle.js",
    },
    module: {
      rules: [
        {
          test: /\.mp4$/,
          use: {
            loader: path.resolve(__dirname, "../dist/index.js"),
            options,
          },
        },
      ],
    },
  });

  const fsVolume = new Volume();

  compiler.outputFileSystem = createFsFromVolume(fsVolume);
  compiler.outputFileSystem.join = path.join.bind(path);

  return {
    compilePromise: new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err || !stats) return reject(err);
        if (stats.hasErrors()) reject(stats.toJson().errors);

        const compiledStats = stats.toJson({ source: true });

        resolve(compiledStats);
      });
    }),
    fsVolume,
  };
}
