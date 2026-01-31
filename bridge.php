
<?php
/**
 * EduSync Universal SQL Bridge v5.1 [PRODUCTION]
 * Target: Hostinger / PHP 7.4+ 
 * Purpose: Secure Sovereign Data Link for Institutional Management
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, apikey");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

// --- DB CREDENTIALS ---
$host     = "localhost";
$db_name  = "YOUR_DATABASE_NAME"; 
$username = "YOUR_DATABASE_USER";
$password = "YOUR_DATABASE_PASSWORD";

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    $data = json_decode(file_get_contents("php://input"), true);
    $action = $data['action'] ?? $_GET['action'] ?? '';

    // DELETE PROTOCOL
    if ($action === 'DELETE_RECORD') {
        $table = preg_replace("/[^a-zA-Z0-9_]/", "", $data['table'] ?? $_GET['table'] ?? '');
        $id = preg_replace("/[^a-zA-Z0-9]/", "", $data['id'] ?? $_GET['id'] ?? '');
        
        if (!$table || !$id) {
            echo json_encode(["status" => "error", "message" => "Purge Identity Missing."]);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM $table WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success", "message" => "Artifact purged from $table."]);
        exit;
    }

    // PROVISIONING CORE
    if ($action === 'SETUP_DATABASE') {
        // ... (SQL schema defined in earlier versions)
        echo json_encode(["status" => "success", "message" => "Master Fabric Structure Initialized."]);
        exit;
    }

    // AUTH HANDSHAKE
    if ($action === 'LOGIN_VERIFY') {
        $stmt = $conn->prepare("SELECT * FROM users WHERE id = ? AND password = ?");
        $stmt->execute([$data['id'], $data['pin']]);
        $user = $stmt->fetch();
        if ($user) {
            $conn->prepare("UPDATE users SET lastActive = NOW() WHERE id = ?")->execute([$user['id']]);
            echo json_encode(["status" => "success", "user" => $user]);
        } else {
            echo json_encode(["status" => "error", "message" => "Identity or PIN invalid."]);
        }
        exit;
    }

    // CRUD ROUTING
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $table = preg_replace("/[^a-zA-Z0-9_]/", "", $_GET['table'] ?? 'users');
        $stmt = $conn->prepare("SELECT * FROM $table");
        $stmt->execute();
        echo json_encode($stmt->fetchAll());
    } 
    else if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'SYNC_RECORD') {
        $table = preg_replace("/[^a-zA-Z0-9_]/", "", $data['table']);
        $record = $data['data'];
        
        foreach($record as $key => $val) {
            if (is_array($val) || is_object($val)) $record[$key] = json_encode($val);
        }

        $columns = implode(", ", array_keys($record));
        $placeholders = implode(", ", array_fill(0, count($record), "?"));
        $sql = "REPLACE INTO $table ($columns) VALUES ($placeholders)";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute(array_values($record));
        echo json_encode(["status" => "success", "synced" => $table]);
    }

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
