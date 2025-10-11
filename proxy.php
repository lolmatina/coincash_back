<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the API path from query parameter
$path = isset($_GET['path']) ? $_GET['path'] : '';
$symbol = isset($_GET['symbol']) ? $_GET['symbol'] : '';
$interval = isset($_GET['interval']) ? $_GET['interval'] : '';
$limit = isset($_GET['limit']) ? $_GET['limit'] : '';

// Build the Binance API URL
$binanceBaseUrl = 'https://api.binance.com/api/v3/';
$url = $binanceBaseUrl . ltrim($path, '/');

// Add query parameters if they exist
$queryParams = [];
if ($symbol) $queryParams['symbol'] = $symbol;
if ($interval) $queryParams['interval'] = $interval;
if ($limit) $queryParams['limit'] = $limit;

// Add any other query parameters from the original request
foreach ($_GET as $key => $value) {
    if (!in_array($key, ['path', 'symbol', 'interval', 'limit'])) {
        $queryParams[$key] = $value;
    }
}

if (!empty($queryParams)) {
    $url .= '?' . http_build_query($queryParams);
}

// Log the request for debugging
error_log("Binance Proxy Request: " . $url);

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_USERAGENT, 'BinanceProxy/1.0');

// Set headers
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Content-Type: application/json'
]);

// Execute the request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

curl_close($ch);

// Handle cURL errors
if ($error) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Proxy error: ' . $error,
        'url' => $url
    ]);
    exit();
}

// Handle HTTP errors
if ($httpCode >= 400) {
    http_response_code($httpCode);
    echo json_encode([
        'error' => 'Binance API error',
        'status' => $httpCode,
        'response' => $response,
        'url' => $url
    ]);
    exit();
}

// Return the response
echo $response;
?>
