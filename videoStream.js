var Mpeg1Muxer, STREAM_MAGIC_BYTES, VideoStream, events, util;

util = require("util");

events = require("events");

Mpeg1Muxer = require("./mpeg1muxer");

STREAM_MAGIC_BYTES = "jsmp"; // Must be 4 bytes

VideoStream = function (options) {
  this.options = options;
  this.name = options.name;
  this.streamUrl = options.streamUrl;
  this.width = options.width;
  this.height = options.height;
  this.inputStreamStarted = false;
  this.stream = undefined;
  this.startMpeg1Stream();
  return this;
};

util.inherits(VideoStream, events.EventEmitter);

VideoStream.prototype.stop = function () {
  this.stream.kill();
  this.inputStreamStarted = false;
  return this;
};

VideoStream.prototype.startMpeg1Stream = function () {
  var gettingInputData, gettingOutputData, inputData, outputData;
  this.mpeg1Muxer = new Mpeg1Muxer({
    ffmpegOptions: this.options.ffmpegOptions,
    url: this.streamUrl,
    ffmpegPath:
      this.options.ffmpegPath == undefined ? "ffmpeg" : this.options.ffmpegPath,
  });
  this.stream = this.mpeg1Muxer.stream;
  if (this.inputStreamStarted) {
    return;
  }
  this.mpeg1Muxer.on("mpeg1data", (data) => {
    return this.emit("camdata", data);
  });
  gettingInputData = false;
  inputData = [];
  gettingOutputData = false;
  outputData = [];
  this.mpeg1Muxer.on("ffmpegStderr", (data) => {
    var size;
    data = data.toString();
    if (data.indexOf("Input #") !== -1) {
      gettingInputData = true;
    }
    if (data.indexOf("Output #") !== -1) {
      gettingInputData = false;
      gettingOutputData = true;
    }
    if (data.indexOf("frame") === 0) {
      gettingOutputData = false;
    }
    if (gettingInputData) {
      inputData.push(data.toString());
      size = data.match(/\d+x\d+/);
      if (size != null) {
        size = size[0].split("x");
        if (this.width == null) {
          this.width = parseInt(size[0], 10);
        }
        if (this.height == null) {
          return (this.height = parseInt(size[1], 10));
        }
      }
    }
  });
  this.mpeg1Muxer.on("ffmpegStderr", function (data) {
    return global.process.stderr.write(data);
  });
  this.mpeg1Muxer.on("exitWithError", () => {
    return this.emit("exitWithError");
  });
  return this;
};

module.exports = VideoStream;
