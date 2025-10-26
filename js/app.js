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
    
    isDetecting = false;
    updateStatus('Stopped');
    
    // Update button states
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    // Clear canvas
    const ctx = canvasElement.getContext('2d');
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

/**
 * Run checker detection on current frame
 */
function detectCheckers() {
    if (!isDetecting || !detectorInstance) return;
    
    try {
        const detections = detectorInstance.detect();
        
        if (detections && detections.length > 0) {
            // Update UI with detection count
            detectionCountElement.textContent = `Detections: ${detections.length}`;
            
            // Log detections to info panel
            updateInfoPanel(detections);
            
            // Send detections to PHP backend
            logDetections(detections);
        }
    } catch (error) {
        console.error('Detection error:', error);
    }
}

/**
 * Update the info panel with recent detections
 */
function updateInfoPanel(detections) {
    if (detections.length === 0) return;
    
    let html = '<p><strong>Recent Detections:</strong></p><ul>';
    detections.slice(-5).forEach((det, idx) => {
        html += `<li>Checker ${idx + 1}: (${Math.round(det.x)}, ${Math.round(det.y)})</li>`;
    });
    html += '</ul>';
    
    infoContent.innerHTML = html;
}

/**
 * Send detections to PHP backend for logging
 */
async function logDetections(detections) {
    if (detections.length === 0) return;
    
    try {
        const response = await fetch('../php/save_move.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                detections: detections,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            console.warn('Failed to log detection to server');
        }
    } catch (error) {
        console.error('Error logging detection:', error);
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

