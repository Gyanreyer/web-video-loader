declare module "*.mp4" {
  const content: {
    sources: {
      src: string;
      type: string;
    }[];
  };

  export default content;
}
