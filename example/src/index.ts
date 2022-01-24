const video: WebVideo = require("assets/BigBuckBunny.mp4?outputFiles=webm/vp9/opus,mp4/h.264/aac&size=?x360");

const videoElement = document.createElement("video");
videoElement.controls = true;
video.sources.forEach(({ src, type }) => {
  const sourceElement = document.createElement("source");
  sourceElement.src = src;
  sourceElement.type = type;

  videoElement.appendChild(sourceElement);
});

document.body.appendChild(videoElement);
