# web-video-loader

A webpack loader for transcoding video assets into web-friendly formats which can be provided to a video's `<source>` tags to ensure each platform will load and play the smallest video file that it can support.

## Building the loader

`npx tsc src/index.ts --outDir dist`

## Testing

In the `/example` directory, run `npx webpack build --mode=development`
