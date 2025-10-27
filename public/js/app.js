/**
 * Main application logic for camera stream and UI control
 */

let videoElement = null;
let canvasElement = null;
let detectorInstance = null;
let isDetecting = false;
let detectionInterval = null;

// DOM elements
let startBtn, stopBtn, statusElement, detectionCountElement, infoContent;

/**
 * Initialize the application
 */
function init() {
    // Get DOM elements
    videoElement = document.getElementById('video');
    canvasElement = document.getElementById('canvas');
    startBtn = document.getElementById('startBtn');
    stopBtn = document.getElementById('stopBtn');
    statusElement = document.getElementById('status');
    detectionCountElement = document.getElementById('detectionCount');
    infoContent = document.getElementById('infoContent');

    // Setup event listeners
    startBtn.addEventListener('click', startDetection);
    stopBtn.addEventListener('click', stopDetection);

    // Initialize detector
    detectorInstance = new CheckerDetector(canvasElement, videoElement);
    
    // Update UI
    updateStatus('Ready to start');
    console.log('App initialized successfully');
}

/**
 * Start camera and detection
 */
async function startDetection() {
    try {
        updateStatus('Requesting camera access...');
        
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Use back camera on mobile
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        videoElement.srcObject = stream;
        updateStatus('Camera started');
        
        // Wait for video to be ready
        videoElement.addEventListener('loadedmetadata', () => {
            // Set canvas size to match video
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            
            // Initialize detector with OpenCV
            detectorInstance.init().then(() => {
                updateStatus('Detection active');
                isDetecting = true;
                
                // Start detection loop
                detectionInterval = setInterval(() => {
                    detectCheckers();
                }, 100); // 10 FPS for performance
                
                // Update button states
                startBtn.disabled = true;
                stopBtn.disabled = false;
            });
        }, { once: true });

    } catch (error) {
        console.error('Error accessing camera:', error);
        updateStatus('Camera access denied');
        showError('Cannot access camera. Please allow camera permissions.');
    }
}

/**
 * Stop camera and detection
 */
function stopDetection() {
    // Set flag first to prevent any in-flight detections from continuing
    isDetecting = false;
    
    // Stop detection loop
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    // Stop video stream
    if (videoElement.srcObject) {
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    
    updateStatus('Stopped');
    
    // Update button states
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    // Clear canvas
    const ctx = canvasElement.getContext('2d');
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

/**
 * Run game state detection on current frame
 */
function detectCheckers() {
    if (!isDetecting || !detectorInstance) return;
    
    try {
        const gameState = detectorInstance.detect();
        
        if (gameState) {
            // Count total detections
            const totalDetections = 
                (gameState.checkers?.length || 0) + 
                (gameState.dice?.red ? 1 : 0) + 
                (gameState.dice?.white ? 1 : 0) + 
                (gameState.cube?.x ? 1 : 0);
            
            // Update UI with detection count
            detectionCountElement.textContent = `Detections: ${totalDetections}`;
            
            // Log detections to info panel
            updateInfoPanel(gameState);
            
            // Send game state to PHP backend
            logGameState(gameState);
        }
    } catch (error) {
        console.error('Detection error:', error);
    }
}

/**
 * Update the info panel with game state information
 */
function updateInfoPanel(gameState) {
    let html = '<p><strong>Current Game State:</strong></p><ul>';
    
    // Checkers
    html += `<li>Checkers: ${gameState.checkers?.length || 0} detected</li>`;
    
    // Dice
    if (gameState.dice) {
        if (gameState.dice.red) {
            html += `<li>Red Die: ${gameState.dice.red.pips || '?'} pips</li>`;
        }
        if (gameState.dice.white) {
            html += `<li>White Die: ${gameState.dice.white.pips || '?'} pips</li>`;
        }
    }
    
    // Doubling Cube
    if (gameState.cube && gameState.cube.x) {
        html += `<li>Doubling Cube: Detected</li>`;
    }
    
    html += '</ul>';
    
    infoContent.innerHTML = html;
}

/**
 * Send complete game state to PHP backend for logging
 */
async function logGameState(gameState) {
    if (!gameState || !isDetecting) return;
    
    try {
        const response = await fetch('/php/save_move.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gameState: gameState,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            console.warn('Failed to log game state to server');
        }
    } catch (error) {
        // Silently ignore fetch errors when stopped
        if (isDetecting) {
            console.error('Error logging game state:', error);
        }
    }
}

/**
 * Update status message
 */
function updateStatus(message) {
    if (statusElement) {
        statusElement.textContent = message;
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    if (infoContent) {
        infoContent.innerHTML = `<p style="color: #d32f2f;">⚠️ ${message}</p>`;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

