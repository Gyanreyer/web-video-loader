const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
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
              fileNameTemplate: "[originalFileName]-[hash]",
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
              mute: true,
              outputPath: "assets/videos",
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js", ".mp4"],
    modules: [path.resolve(__dirname, "./")],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  plugins: [new HtmlWebpackPlugin()],
};
