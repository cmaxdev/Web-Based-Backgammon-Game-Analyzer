/**
 * Checker Detection Module using OpenCV.js
 * Detects circular checker pieces on backgammon board
 */

class CheckerDetector {
    constructor(canvas, video) {
        this.canvas = canvas;
        this.video = video;
        this.ctx = canvas.getContext('2d');
        this.initialized = false;
        this.srcMat = null;
        this.grayMat = null;
        this.blurMat = null;
        this.circles = null;
    }

    /**
     * Initialize OpenCV and prepare matrices
     */
    async init() {
        return new Promise((resolve, reject) => {
            if (typeof cv === 'undefined') {
                console.error('OpenCV.js is not loaded');
                reject(new Error('OpenCV.js not available'));
                return;
            }

            this.initialized = true;
            this.srcMat = new cv.Mat();
            this.grayMat = new cv.Mat();
            this.blurMat = new cv.Mat();
            this.circles = new cv.Mat();

            console.log('CheckerDetector initialized');
            resolve();
        });
    }

    /**
     * Main detection method
     * @returns {Array} Array of detection objects with x, y, radius
     */
    detect() {
        if (!this.initialized || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            return [];
        }

        try {
            // Read video frame to matrix
            this.srcMat = cv.imread(this.video);

            // Convert to grayscale
            cv.cvtColor(this.srcMat, this.grayMat, cv.COLOR_RGBA2GRAY);

            // Apply Gaussian blur to reduce noise
            cv.GaussianBlur(this.grayMat, this.blurMat, new cv.Size(9, 9), 2, 2);

            // Detect circles using HoughCircles
            const circles = new cv.Mat();
            cv.HoughCircles(
                this.blurMat,
                circles,
                cv.HOUGH_GRADIENT,
                1,                    // dp (inverse ratio)
                this.grayMat.rows / 8, // minDist
                100,                   // param1 (Canny edge threshold)
                30,                    // param2 (accumulator threshold)
                15,                    // minRadius (minimum checker size)
                50                     // maxRadius (maximum checker size)
            );

            // Store detections
            const detections = [];

            // Process detected circles
            for (let i = 0; i < circles.rows; i++) {
                const circle = circles.data32F;
                const x = circle[i * 3];
                const y = circle[i * 3 + 1];
                const radius = circle[i * 3 + 2];

                // Only include circles within reasonable bounds
                if (x > 0 && y > 0 && x < this.canvas.width && y < this.canvas.height) {
                    detections.push({ x, y, radius });

                    // Draw bounding box on canvas
                    this.drawDetection(x, y, radius);
                }
            }

            // Clean up
            circles.delete();

            return detections;

        } catch (error) {
            console.error('Detection error:', error);
            return [];
        }
    }

    /**
     * Draw detection bounding box on canvas
     */
    drawDetection(x, y, radius) {
        this.ctx.save();
        
        // Draw circle outline
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();

        // Draw center point
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(x - 2, y - 2, 4, 4);

        // Draw label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Checker', x + radius + 5, y);

        this.ctx.restore();
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.srcMat) this.srcMat.delete();
        if (this.grayMat) this.grayMat.delete();
        if (this.blurMat) this.blurMat.delete();
        if (this.circles) this.circles.delete();
    }
}

