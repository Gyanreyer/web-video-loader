const path = require("path");

module.exports = {
  entry: "./index.ts",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.mp4$/,
        use: [
          {
            loader: path.resolve("../dist/index.js"),
            options: {
              outputFiles: [
                {
                  container: "mp4",
                  videoCodec: "h.264",
                },
                {
                  container: "mp4",
                  videoCodec: "h.265",
                },
                {
                  container: "webm",
                  videoCodec: "vp9",
                },
              ],
              compressionEfficiencyPreset: "superfast",
              outputPath: "assets/videos",
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js", ".mp4"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    // clean: true,
  },
};
