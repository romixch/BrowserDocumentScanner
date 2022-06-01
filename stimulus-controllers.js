import { Application, Controller } from "https://unpkg.com/@hotwired/stimulus/dist/stimulus.js"
window.Stimulus = Application.start()

Stimulus.register("opencv-loading", class extends Controller {
    static targets = ["loading"]

    connect() {
        window.addEventListener("opencv-loaded", () => this.hide())
    }

    hide() {
        this.loadingTarget.classList.add("hidden");
    }
})

Stimulus.register("document-detection", class extends Controller {
    static targets = ["switch", "video", "videoSize", "canvas", "canvasOutput", "transformedOutput"]

    async switch() {
        if (this.started) {
            this.stop();
            this.started = false;
        } else {
            this.start();
            this.started = true;
        }
    }

    async start() {
        this.switchTarget.innerText = "Stop";
        await this.captureVideo();
        this.conversionTimerId = setInterval(() => this.convertImage(), 200);
    }

    async stop() {
        this.switchTarget.innerText = "Start";
        if (this.conversionTimerId) {
            clearInterval(this.conversionTimerId);
        }
        window.stream.getVideoTracks().forEach((track) => track.stop());
        window.stream = null;
    }

    async captureVideo() {
        const constraints = {
            audio: false,
            video: {
              facingMode: "environment",
              width: { min: 720, ideal: 4096 },
              height: { min: 720, ideal: 4096 }
            }
          };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        window.stream = stream;
        this.videoTarget.srcObject = stream;
        const videoSettings = stream.getVideoTracks()[0].getSettings();
        this.videoSizeTarget.innerText = videoSettings.width + ' x ' + videoSettings.height;;
        const downsizeFactor = calculateDownsizeFactor(videoSettings.height, videoSettings.width);
        this.canvasTarget.height = videoSettings.height / downsizeFactor;
        this.canvasTarget.width = videoSettings.width / downsizeFactor;
    }

    async convertImage() {
      var context = this.canvasTarget.getContext('2d');
      context.drawImage(this.videoTarget, 0, 0, this.canvasTarget.width, this.canvasTarget.height);
      this.documentCoords = processImage(this.canvasTarget);
    }

    async cutOut() {
      const src = cv.imread(this.canvasTarget);
      cutOutDocument(src, this.documentCoords);
    }
})