<?php
/**
 * Backend PHP script to log complete game state to moves.txt
 * Handles POST requests with JSON data for checkers, dice, doubling cube, etc.
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
if (!$data || !isset($data['gameState']) || !isset($data['timestamp'])) {
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
    
    // Process complete game state
    $gameState = $data['gameState'];
    $logEntries = [];

    // Log checkers
    if (isset($gameState['checkers']) && is_array($gameState['checkers'])) {
        $logEntries[] = "[{$timestamp}] === CHECKERS === (" . count($gameState['checkers']) . " found)\n";
        foreach ($gameState['checkers'] as $checker) {
            $x = isset($checker['x']) ? round($checker['x']) : 0;
            $y = isset($checker['y']) ? round($checker['y']) : 0;
            $logEntries[] = "  - Checker at position (x:{$x}, y:{$y})\n";
        }
    }
    
    // Log dice
    if (isset($gameState['dice'])) {
        $logEntries[] = "[{$timestamp}] === DICE ===\n";
        if (isset($gameState['dice']['red'])) {
            $x = round($gameState['dice']['red']['x']);
            $y = round($gameState['dice']['red']['y']);
            $pips = $gameState['dice']['red']['pips'] ?? '?';
            $logEntries[] = "  - Red Die: {$pips} pips at (x:{$x}, y:{$y})\n";
        }
        if (isset($gameState['dice']['white'])) {
            $x = round($gameState['dice']['white']['x']);
            $y = round($gameState['dice']['white']['y']);
            $pips = $gameState['dice']['white']['pips'] ?? '?';
            $logEntries[] = "  - White Die: {$pips} pips at (x:{$x}, y:{$y})\n";
        }
    }
    
    // Log doubling cube
    if (isset($gameState['cube']) && isset($gameState['cube']['x'])) {
        $logEntries[] = "[{$timestamp}] === DOUBLING CUBE ===\n";
        $x = round($gameState['cube']['x']);
        $y = round($gameState['cube']['y']);
        $value = $gameState['cube']['value'] ?? '?';
        $logEntries[] = "  - Cube at (x:{$x}, y:{$y}), value: {$value}\n";
    }
    
    $logEntries[] = "\n"; // Empty line for readability

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

