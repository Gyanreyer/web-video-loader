# web-video-loader

A webpack loader for transcoding video assets into web-friendly formats which can be provided to a video's `<source>` tags to ensure each platform will load and play the smallest video file that it can support.

## Building the loader

`npm run build`

## Testing

In the `/example` directory, run `npx webpack build --mode=development`

## Remaining TODOs

- Look into additional settings that can make using the AV1 codec more viable (currently it takes several minutes even on a pretty powerful computer which is just unacceptable for a webpack build)
  - Explore multi-threading, any other possibilities
- Make it more clear what the "quality" option means; offer the ability to choose between a constant bitrate and a variable bitrate
- Other odds and ends
  - File name template (ie, "video-[videoCodec]-[audioCodec]-[hash].[ext]")
  - Code cleanup, make sure things are thoroughly commented and types are declared where it makes the most sense
