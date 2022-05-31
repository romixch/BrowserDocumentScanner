import { Application, Controller } from "https://unpkg.com/@hotwired/stimulus/dist/stimulus.js"
window.Stimulus = Application.start()

Stimulus.register("opencv-loading", class extends Controller {
    static targets = ["loading", "loaded", "script"]
    
    connect() {
        window.addEventListener("opencv-loaded", () => this.reveal())
    }

    reveal() {
        this.loadingTarget.classList.add("hidden");
        this.loadedTarget.classList.remove("hidden");
    }
})