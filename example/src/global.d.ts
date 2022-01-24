declare interface WebVideoSource {
  src: string;
  type: string;
}

declare interface WebVideo {
  sources: WebVideoSource[];
}

declare module "*.mp4" {
  const content: WebVideo;
  export default content;
}
