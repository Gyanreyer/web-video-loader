import video from "./BigBuckBunny.mp4";

console.log(video);
const videoElement = document.createElement("video");
videoElement.controls = true;
video.sources.forEach(({ src, type }) => {
  const sourceElement = document.createElement("source");
  sourceElement.src = src;
  sourceElement.type = type;

  videoElement.appendChild(sourceElement);
});

document.body.appendChild(videoElement);
