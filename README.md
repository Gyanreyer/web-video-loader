# web-video-loader

A webpack loader for transcoding video assets (or gifs!) into web-friendly video formats which can be provided to a video's `<source>` tags to ensure each platform will load and play the smallest video file that it can support.

## TODO

- Offer finer grain control over transcode quality
  - API to pass through any custom ffmpeg commands you want
  - Make quality levels dynamically adjust based on the input file
    - DONE: calculate target bitrate for vp8 based on video dimensions and framerate
    - TODO: add "quality presets", ie low/medium/high quality

## Example Webpack config

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.mp4$/,
        use: [
          {
            loader: "web-video-loader",
            options: {
              outputPath: "assets/videos",
              fileNameTemplate: "[originalFileName]-[hash]",
              outputFormats: [
                {
                  container: "mp4",
                  videoCodec: "h.264",
                },
                {
                  container: "webm",
                  videoCodec: "vp9",
                },
              ],
              mute: true,
            },
          },
        ],
      },
    ]
  }
}
```

## Options

### `outputPath`

type: `string` | default: `"/"`

The path within the output directory which this loader should output video assets to. Defaults to the root of the output directory.

### `publicPath`

type: `string` | default: `undefined`

An optional custom public path alias to use for URLs pointing to the directory where the video assets were output. By default, this will just match the value of `outputPath`.

### `fileNameTemplate`

type: `string` | default: `"[originalFileName]-[hash]"`

A string describing how each video file output from the loader should be named. The string may include tags that will be filled in with data for each video file. The following tags are supported:

- `[hash]`: Unique hash identifying the video file. **It is highly recommended that you include this to ensure each output file has a unique name.**

- `[originalFileName]`: The name of the original input file, excluding the extension.

- `[videoCodec]`: The name of the video codec used for the video file.

- `[audioCodec]`: The name of the audio codec used for the video file.

### `mute`

type: `string` | default: `false`

Whether the output video assets should be muted.

### `size`

type: `string` | default: `undefined`

A string describing how the output video assets should be scaled relative to the original. By default, the output videos will have the same dimensions as the original video file. This option directly maps to the [fluent-ffmpeg library's size option](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#video-frame-size-options), so the following formats are supported:

- `640x480`: set a fixed output size in pixel width x height. This may result in the video being stretched or squeezed to fit the requested size.
- `640x?`: set a fixed pixel width and compute the height automatically to preserve the original video's aspect ratio.
- `?x480`: set a fixed pixel height and compute the width automatically to preserve the original video's aspect ratio.
- `50%`: rescale both width and height by a percentage, preserving the original video's aspect ratio.

### `esModule`

type: `boolean` | default: `false`

Whether the module generated by the loader should use ESModule `export` syntax or CommonJS `module.exports` syntax.

### `cache`

type: `boolean` | default: `true`

Whether video assets output from the loader should be cached. This is highly recommended to help speed up build times on subsequent builds.

### `outputFormats`

type: `Object[]` | default: `[{ container: "mp4", videoCodec: "h.264" }, { container: "webm", videoCodec: "vp9" }]`

An array of objects describing the format of each video asset that the loader should output. Each object has the following format:

- `container` <`string`>: The video container to use for the output. Supported containers:
  - `mp4`: the most widely supported video container across all browsers.
  - `webm`: supported in most modern browsers, generally capable of achieving smaller file sizes.

- `videoCodec` <`string`>: The codec to encode the video with. Supported codecs depend on which container is being used:
  - `mp4` supported video codecs:
    - `"h.264"`: The most widely supported video codec. It is recommended you always include an `"mp4"/"h.264"` output format because it has the highest likelihood of being playable in every browser. This will be the default video codec for the `mp4` container if a video codec is not specified.
    - `"h.265"`: Provides a significantly smaller file size for similar quality compared to `"h.264"`, but is only supported in the Safari browser on Apple devices.
    - `"av1"`: Usually produces the best quality relative to file size, but can come at the tradeoff of slow encoding times. Safari does not support playback of av1 videos and Firefox can have issues too, but it will very likely work in Chrome.
  - `webm` supported video codecs:
    - `"vp8"`: Smaller file sizes than `h.264` and well supported across all modern browsers, but not recommended due to quality tradeoffs.
    - `"vp9"`: The successor to `vp8`. Much more efficient in terms of quality/file size, but may have weaker browser support, particularly in Safari. This will be the default video codec used for the `webm` container if a video codec is not specified.

- `audioCodec` <`string`>: The codec to encode any audio in the video with. It's generally pretty safe to not worry about setting this, but the option is available if needed. Supported codecs depend on which container is being used:
  - `mp4`
    - `"aac"`: Lossy audio codec supported across all browsers. Recommended for most use cases; this will be the default audio codec used for the `mp4` container if an audio codec is not specified.
    - `"flac"`: Lossless audio codec; produces larger file sizes and is only supported in more modern browsers, but may have higher quality.
  - `webm`
    - `"opus"`: Lossy audio codec cupported across most modern browsers. This will be the default audio codec used for the `webm` container if an audio codec is not specified.
    - `"vorbis"`: May have slightly better support on older devices, but otherwise is not as strongly supported as `opus` on modern devices and has no other notable advantages over `opus`. You probably should not use this.

## Setting options via resource query params

If you have a certain option configuration that you only want to apply to one individual imported video, you can override any options in the webpack config via query params on the import. For example:

```ts
// This video should be resized to 480px tall
import my480pVideo from "assets/video.mp4?size=?x480";

// This video should be muted
import mutedVideo from "assets/other-video.mp4?mute=true";
```

All options which accept primitive string or boolean values can be used exactly how you would expect in query params, but the `outputFormats` option requires special formatting...

### Setting outputFormats via a query pram

The `outputFormats` query param accepts comma-separated strings in the format `<container>/<videoOrAudioCodec>/<videoOrAudioCodec>`.

The video file container is the only portion of the string that is required:

```ts
import video from "assets/video.mp4?outputFormats=mp4,webm";
```

Setting both the container and video codec:

```ts
import video from "assets/video.mp4?outputFormats=mp4/h.264,webm/vp9";
```

Setting the container and both video and audio codecs:

```ts
import video from "assets/video.mp4?outputFormats=mp4/h.264/aac,webm/vp9/opus";
```

## Output Module

The module created by the loader for an import will be an object with the shape:

- `sources` <`Object[]`>: An array of objects describing each video asset output from the loader. Each source object has the shape:
  - `src` <`string`>: URL path to the video asset
  - `type` <`string`>: MIME type of the video asset (ie, "video/mp4"). This helps browsers quickly identify whether they can play a given source or not without having to load it first.

Sources are sorted by file size from smallest to largest.

The recommended usage is to add a `<source>` tag for each of these source objects to a `<video>` element; the `<video>` will find the first of these sources which the browser supports and load and play that, so it's important to retain the file size ordering to ensure the smallest supported video file will always be used.

## Example Usage

### React

```jsx
import myVideo from "assets/myVideo.mp4";

function VideoComponent(){
  return (
    <video>
      {myVideo.sources.map(({ src, type }) => (
        <source key={src} src={src} type={type} />
      ))}
    </video>
  );
}
```

### Vanilla JS

```js
import myVideo from "assets/myVideo.mp4";

const videoElement = document.getElementById("video");

myVideo.sources.forEach(({ src, type }) => {
  const sourceElement = document.createElement("source");
  sourceElement.src = src;
  sourceElement.type = type;

  videoElement.appendChild(sourceElement);
});
```

## Usage with TypeScript

Add the following declarations to a `global.d.ts` file:

```ts
declare interface WebVideoSource {
  src: string;
  type: string;
}

declare interface WebVideo {
  sources: WebVideoSource[];
}

// Change or duplicate this declaration for every unique
// file extension you expect to use for you source video files
// (ie, "*.mov")
declare module "*.mp4" {
  const content: WebVideo;
  export default content;
}

```

Then you will be able to import your videos like so and they will be properly typed:

```ts
// Esm import syntax:
import video from "assets/video.mp4";
// Commonjs require syntax
const video: WebVideo = require("assets/video.mp4");
```

## Special Thanks

A big thank you to [dazuaz](https://github.com/dazuaz) and their [responsive-loader](https://github.com/dazuaz/responsive-loader) project, which inspired this project and served as a major reference point when building this.

Additionally, thank you to all of the wonderful contributors behind the [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) and [ffmpeg](https://github.com/FFmpeg/FFmpeg) libraries. Without you, none of this would be possible!
