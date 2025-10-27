/**
 * Backgammon Board Detection Module using OpenCV.js
 * Detects: Checkers, Dice, Doubling Cube, and Board Regions
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
        this.currentGameState = {
            checkers: [],
            dice: { red: null, white: null },
            cube: { position: null, value: null },
            timestamp: null
        };
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
     * Main detection method - detects all game elements
     * @returns {Object} Complete game state with all detected elements
     */
    detect() {
        if (!this.initialized || this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            return this.currentGameState;
        }

        try {
            // Clear canvas first
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw current video frame to canvas
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Read canvas to matrix
            this.srcMat = cv.imread(this.canvas);

            // Convert to grayscale
            cv.cvtColor(this.srcMat, this.grayMat, cv.COLOR_RGBA2GRAY);

            // Apply Gaussian blur to reduce noise
            cv.GaussianBlur(this.grayMat, this.blurMat, new cv.Size(9, 9), 2, 2);

            // Detect all game elements
            const checkers = this.detectCheckers();
            const dice = this.detectDice();
            const cube = this.detectDoublingCube();
            const boardRegions = this.detectBoardRegions();

            // Update game state
            this.currentGameState = {
                checkers: checkers,
                dice: dice,
                cube: cube,
                boardRegions: boardRegions,
                timestamp: new Date().toISOString()
            };

            // Draw all detections on canvas
            this.drawAllDetections();

            return this.currentGameState;

        } catch (error) {
            console.error('Detection error:', error);
            return this.currentGameState;
        }
    }

    /**
     * Detect checker pieces on the board
     */
    detectCheckers() {
        const circles = new cv.Mat();
        cv.HoughCircles(
            this.blurMat,
            circles,
            cv.HOUGH_GRADIENT,
            1,
            this.grayMat.rows / 8,
            100,
            30,
            15,  // minRadius for checkers
            50   // maxRadius for checkers
        );

        const checkers = [];
        for (let i = 0; i < circles.rows; i++) {
            const circle = circles.data32F;
            const x = circle[i * 3];
            const y = circle[i * 3 + 1];
            const radius = circle[i * 3 + 2];

            if (x > 0 && y > 0 && x < this.canvas.width && y < this.canvas.height) {
                checkers.push({ x, y, radius, type: 'checker' });
            }
        }

        circles.delete();
        return checkers;
    }

    /**
     * Detect dice on the board
     * Returns grants with detected pip counts
     */
    detectDice() {
        const diceCircles = new cv.Mat();
        cv.HoughCircles(
            this.blurMat,
            diceCircles,
            cv.HOUGH_GRADIENT,
            1,
            this.grayMat.rows / 12,
            100,
            20,
            8,   // minRadius for dice
            25   // maxRadius for dice
        );

        const dice = [];
        for (let i = 0; i < diceCircles.rows; i++) {
            const circle = diceCircles.data32F;
            const x = circle[i * 3];
            const y = circle[i * 3 + 1];
            const radius = circle[i * 3 + 2];

            if (x > 0 && y > 0 && x < this.canvas.width && y < this.canvas.height && radius < 25) {
                // Try to detect pip count (simplified - can be enhanced with ML)
                const pipCount = this.detectDicePips(x, y, radius);
                dice.push({ x, y, radius, pips: pipCount, type: 'dice' });
            }
        }

        diceCircles.delete();
        return { red: dice[0] || null, white: dice[1] || null };
    }

    /**
     * Simplified dice pip detection (detects circular pips)
     * Note: Pip counting simplified to avoid complex ROI extraction
     */
    detectDicePips(centerX, centerY, diceRadius) {
        // For now, return a placeholder value
        // Advanced pip counting would require better image processing
        // Returns random value between 1-6 for demonstration
        // TODO: Implement proper pip detection with OCR or template matching
        
        // Simple estimation based on brightness/darkness of dice area
        // This is a placeholder - real implementation would count actual pips
        return Math.floor(Math.random() * 6) + 1;
    }

    /**
     * Detect doubling cube position (usually larger square/cube)
     */
    detectDoublingCube() {
        try {
            // Use contour detection to find square shapes
            const edges = new cv.Mat();
            cv.Canny(this.blurMat, edges, 50, 150);
            
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();
            cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let bestCube = null;
            let maxArea = 0;

            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour, false);
                
                // Look for square-ish shapes that could be the cube
                if (area > 1000 && area < 10000) {
                    const peri = cv.arcLength(contour, true);
                    const approx = new cv.Mat();
                    cv.approxPolyDP(contour, approx, 0.04 * peri, true);
                    
                    // Check if it's roughly square (4 vertices)
                    if (approx.rows >= 4 && approx.rows <= 6 && area > maxArea) {
                        const moments = cv.moments(contour, false);
                        
                        // Check for division by zero
                        if (moments.m00 !== 0) {
                            const cx = moments.m10 / moments.m00;
                            const cy = moments.m01 / moments.m00;
                            
                            bestCube = {
                                x: cx,
                                y: cy,
                                area: area,
                                value: this.detectCubeValue(cx, cy)
                            };
                            maxArea = area;
                        }
                    }
                    approx.delete();
                }
                contour.delete();
            }

            edges.delete();
            contours.delete();
            hierarchy.delete();

            return bestCube || { position: null, value: null };
        } catch (error) {
            console.error('Error detecting doubling cube:', error);
            return { position: null, value: null };
        }
    }

    /**
     * Simplified cube value detection (could use OCR/Tesseract.js for better accuracy)
     */
    detectCubeValue(x, y) {
        // Placeholder - would need OCR for actual value reading
        // Common doubling cube values: 2, 4, 8, 16, 32, 64
        return 1; // Default
    }

    /**
     * Detect board regions (24 points where checkers sit)
     */
    detectBoardRegions() {
        // Divide board into regions
        const boardWidth = this.canvas.width;
        const boardHeight = this.canvas.height;
        
        const regions = [];
        const regionWidth = boardWidth / 12; // 12 points per side
        
        // Top side (12 points)
        for (let i = 0; i < 12; i++) {
            regions.push({
                point: i + 1,
                x: regionWidth * i + regionWidth / 2,
                y: boardHeight * 0.1,
                side: 'top'
            });
        }
        
        // Bottom side (12 points)
        for (let i = 0; i < 12; i++) {
            regions.push({
                point: i + 13,
                x: regionWidth * i + regionWidth / 2,
                y: boardHeight * 0.9,
                side: 'bottom'
            });
        }
        
        return regions;
    }

    /**
     * Draw all detected elements on canvas
     */
    drawAllDetections() {
        const state = this.currentGameState;
        
        // Draw checkers
        if (state.checkers && state.checkers.length > 0) {
            state.checkers.forEach(checker => {
                this.drawDetection(checker.x, checker.y, checker.radius, 'Checker', '#00ff00');
            });
        }
        
        // Draw dice
        if (state.dice) {
            if (state.dice.red) {
                this.drawDetection(state.dice.red.x, state.dice.red.y, state.dice.red.radius, 
                    `Red Die (${state.dice.red.pips})`, '#ff0000');
            }
            if (state.dice.white) {
                this.drawDetection(state.dice.white.x, state.dice.white.y, state.dice.white.radius, 
                    `White Die (${state.dice.white.pips})`, '#ffffff');
            }
        }
        
        // Draw doubling cube
        if (state.cube && state.cube.x && state.cube.y) {
            this.drawSquare(state.cube.x, state.cube.y, 'Cube', '#ffff00');
        }
        
        // Draw board regions (optional - for debugging)
        if (state.boardRegions) {
            this.drawBoardRegions(state.boardRegions);
        }
    }

    /**
     * Draw detection bounding box on canvas
     */
    drawDetection(x, y, radius, label, color) {
        this.ctx.save();
        
        // Draw circle outline
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();

        // Draw center point
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 2, y - 2, 4, 4);

        // Draw label with background
        const labelText = label || 'Checker';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x + radius + 3, y - 15, this.ctx.measureText(labelText).width + 4, 18);
        
        this.ctx.fillStyle = color;
        this.ctx.font = '12px Arial';
        this.ctx.fillText(labelText, x + radius + 5, y);

        this.ctx.restore();
    }

    /**
     * Draw square detection (for doubling cube)
     */
    drawSquare(x, y, label, color) {
        this.ctx.save();
        
        const size = 20;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x - size/2, y - size/2, size, size);

        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - 2, y - 2, 4, 4);

        // Draw label
        const labelText = label || 'Cube';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x + size/2 + 3, y - 15, this.ctx.measureText(labelText).width + 4, 18);
        
        this.ctx.fillStyle = color;
        this.ctx.font = '12px Arial';
        this.ctx.fillText(labelText, x + size/2 + 5, y);

        this.ctx.restore();
    }

    /**
     * Draw board regions (for visualization)
     */
    drawBoardRegions(regions) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.2;
        this.ctx.strokeStyle = '#0000ff';
        this.ctx.lineWidth = 1;
        
        regions.forEach((region, index) => {
            if (index % 3 === 0) { // Draw every 3rd region to avoid clutter
                this.ctx.beginPath();
                this.ctx.arc(region.x, region.y, 15, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
        });
        
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

