import path from "path";
import webpack from "webpack";
import { createFsFromVolume, Volume } from "memfs";

function compiler(
  fixture: string,
  options = {}
): Promise<webpack.Stats | undefined> {
  const compiler = webpack({
    context: __dirname,
    entry: `./${fixture}`,
    output: {
      path: path.resolve(__dirname),
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

  compiler.outputFileSystem = createFsFromVolume(new Volume());
  compiler.outputFileSystem.join = path.join.bind(path);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err || !stats) return reject(err);
      if (stats.hasErrors()) reject(stats.toJson().errors);

      resolve(stats);
    });
  });
}

export default compiler;
