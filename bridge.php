
<?php
/**
 * EduSync Universal SQL Bridge v6.2 [STABLE]
 * Target: Hostinger / PHP 7.4+ 
 * Purpose: Secure Sovereign Data Link with SMTP Report Dispatch Support
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, apikey, Prefer");

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
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? null;
    $table  = $_GET['table'] ?? 'users';
    $table  = preg_replace("/[^a-zA-Z0-9_]/", "", $table);

    // --- DELETION PROTOCOL ---
    function perform_delete($conn, $table) {
        $id = null;
        if (isset($_GET['id'])) {
            $id = str_replace('eq.', '', $_GET['id']);
        }
        if (!$id) {
            $input = json_decode(file_get_contents("php://input"), true);
            if (isset($input['id'])) {
                $id = $input['id'];
            }
        }
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Decommission Fault: Artifact ID missing."]);
            exit;
        }
        $stmt = $conn->prepare("DELETE FROM `$table` WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success", "message" => "Identity artifact decommissioned."]);
        exit;
    }

    // --- SMTP DISPATCH PROTOCOL ---
    if ($action === 'test_smtp' || $action === 'send_report') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $smtp_host = $data['host'] ?? 'smtp.relay.edu';
        $smtp_port = $data['port'] ?? '587';
        $smtp_user = $data['user'] ?? '';
        $smtp_pass = $data['pass'] ?? '';
        $to        = $data['test_email'] ?? $data['recipient'] ?? '';
        $subject   = $data['subject'] ?? 'System Handshake';
        $message   = $data['body'] ?? 'SMTP Verification Successful.';

        if (!$to) {
            echo json_encode(["status" => "error", "message" => "Recipient missing."]);
            exit;
        }

        $headers = [
            "From: $smtp_user",
            "Reply-To: $smtp_user",
            "X-Mailer: PHP/" . phpversion(),
            "Content-type: text/plain; charset=UTF-8"
        ];

        // Standard PHP mail() often blocked on shared hosting for external SMTP.
        // For Hostinger/Standard, this uses the internal mail transport which respects host settings.
        if (mail($to, $subject, $message, implode("\r\n", $headers))) {
            echo json_encode(["status" => "success", "message" => "Mail artifact dispatched successfully."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Transport failure: The mail server rejected the handshake."]);
        }
        exit;
    }

    if ($method === 'DELETE' || ($method === 'POST' && $action === 'delete')) {
        perform_delete($conn, $table);
    }

    if ($method === 'GET') {
        $where = "1=1";
        $params = [];
        foreach ($_GET as $key => $val) {
            if ($key === 'table' || $key === 'select' || $key === 'action') continue;
            if (strpos($val, 'eq.') === 0) {
                $where .= " AND `$key` = ?";
                $params[] = str_replace('eq.', '', $val);
            }
        }
        $stmt = $conn->prepare("SELECT * FROM `$table` WHERE $where ORDER BY id DESC");
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) throw new Exception("Payload empty.");
        foreach($data as $key => $val) {
            if (is_array($val) || is_object($val)) $data[$key] = json_encode($val);
        }
        $columns = implode("`, `", array_keys($data));
        $placeholders = implode(", ", array_fill(0, count($data), "?"));
        $sql = "REPLACE INTO `$table` (`$columns`) VALUES ($placeholders)";
        $stmt = $conn->prepare($sql);
        $stmt->execute(array_values($data));
        echo json_encode(["status" => "success", "message" => "Registry updated."]);
        exit;
    }

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Bridge Fault: " . $e->getMessage()]);
}
?>
