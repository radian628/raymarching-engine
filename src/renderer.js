//Define canvas for WebGL.
// let c = document.getElementById("canvas");

// let recording = document.getElementById("recording");
// let submit = document.getElementById("submit");

class TiledRenderer {
    async init(raymarcher) {
        this.raymarcher = raymarcher;
        this.done = true;
    }

    async startRender(renderData, partitions, samples, url) {
        this.url = url;
        this.time = 0;
        this.presentInterval = 1;
        this.renderData = renderData;
        this.partitions = partitions;
        this.partitionX = 0;
        this.partitionY = 0;
        this.isFirstIteration = true;

        this.resetScissor = true;

        this.samples = samples;
        this.sampleIndex = 0;

        this.framesRendered = 0;

        this.raymarcher.setAllShaderState(this.renderData[0], true);
        this.raymarcher.registerCustomUniforms();
        this.raymarcher.gl.enable(this.raymarcher.gl.SCISSOR_TEST);
        await this.raymarcher.updateStateIfNeeded();

        this.done = false;
    }

    async endRender() {
        this.raymarcher.gl.disable(this.raymarcher.gl.SCISSOR_TEST);
    }

    setScissor() {        
        this.raymarcher.gl.scissor(
            this.partitionXSize * this.partitionX,
            this.partitionYSize * this.partitionY,
            this.partitionXSize,
            this.partitionYSize
        );
    }

    async nextFrame() {
        this.time++;

        this.partitionXSize = this.raymarcher.surface.width / this.partitions;
        this.partitionYSize = this.raymarcher.surface.height / this.partitions;
        
        let rmState = this.renderData[this.framesRendered];

        if (this.isFirstIteration) {
            this.raymarcher.gl.scissor(0, 0, this.raymarcher.canvas.width, this.raymarcher.canvas.height);
            await this.raymarcher.clearFramebuffers();
            this.raymarcher.setAllShaderState(rmState, true);
            console.log(this.raymarcher.shaderState.resolution[0], this.raymarcher.shaderState.resolution[1]);
            this.isFirstIteration = false;
        }
        if (this.resetScissor) {
            this.setScissor();
            this.resetScissor = false;
        }

        await this.raymarcher.renderSingleFrame();

        this.sampleIndex++;
        
        if (this.sampleIndex >= this.samples) {
            this.sampleIndex = 0;
            this.partitionX++;
            if (this.partitionX > this.partitions) {
                this.partitionX = 0;
                this.partitionY++;
                if (this.partitionY > this.partitions) {
                    
                    this.raymarcher.gl.finish();
                    await fetch(this.url.replace("%INDEX%", this.framesRendered), {
                        method: "PUT",
                        headers: {
                            "Content-Type": "image/png"
                        },
                        body: this.raymarcher.canvas.toDataURL()
                    });

                    this.raymarcher.presentFramebuffer();

                    this.partitionY = 0;
                    this.framesRendered++;
                    this.sampleIndex = -1;
                    this.resetScissor = true;
                    this.isFirstIteration = true;
                }
            }
            this.resetScissor = true;
        }

        if (this.time % this.presentInterval == 0) {
            this.raymarcher.presentFramebuffer();
        }
        if (!(this.framesRendered < this.renderData.length)) {
            this.done = true;
        }
    }
}