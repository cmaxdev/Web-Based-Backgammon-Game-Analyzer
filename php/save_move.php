<?php
/**
 * Backend PHP script to log checker detections to moves.txt
 * Handles POST requests with JSON data
 */

// Set headers for JSON response
header('Content-Type: application/json');

// Handle CORS for local development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST method allowed']);
    exit;
}

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validate input
if (!$data || !isset($data['detections']) || !isset($data['timestamp'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data format']);
    exit;
}

try {
    // Path to moves.txt file
    $logFile = __DIR__ . '/moves.txt';
    
    // Create directory if it doesn't exist
    if (!is_dir(__DIR__)) {
        mkdir(__DIR__, 0777, true);
    }

    // Format timestamp
    $timestamp = date('Y-m-d H:i:s');
    
    // Process detections
    $detections = $data['detections'];
    $logEntries = [];

    foreach ($detections as $detection) {
        // Format: [timestamp] Checker detected at position (x:x, y:y)
        $x = isset($detection['x']) ? round($detection['x']) : 0;
        $y = isset($detection['y']) ? round($detection['y']) : 0;
        
        $logEntries[] = "[{$timestamp}] Checker detected at position (x:{$x}, y:{$y})\n";
    }

    // Append to file
    $success = false;
    if (!empty($logEntries)) {
        $success = file_put_contents(
            $logFile, 
            implode('', $logEntries), 
            FILE_APPEND | LOCK_EX
        ) !== false;
    }

    if ($success) {
        echo json_encode([
            'success' => true,
            'logged' => count($logEntries),
            'timestamp' => $timestamp
        ]);
    } else {
        throw new Exception('Failed to write to log file');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $e->getMessage()
    ]);
}
?>

