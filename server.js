const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, "orders.json");
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jsx": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

ensureDataFile();

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === "/api/orders" && req.method === "GET") {
      return sendJson(res, 200, readOrders());
    }

    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        service: "conference-backend",
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === "/api/orders/pending" && req.method === "GET") {
      const pendingOrders = readOrders().filter((order) => order.status === "pending");
      return sendJson(res, 200, pendingOrders);
    }

    if (pathname === "/api/orders" && req.method === "POST") {
      const body = await readBody(req);
      const payload = parseJson(body);
      const validationError = validateOrderPayload(payload);

      if (validationError) {
        return sendJson(res, 400, { message: validationError });
      }

      const orders = readOrders();
      const order = {
        id: createOrderId(),
        status: "pending",
        submittedAt: new Date().toISOString(),
        ...payload
      };

      orders.push(order);
      writeOrders(orders);
      return sendJson(res, 201, order);
    }

    if (pathname.startsWith("/api/orders/") && pathname.endsWith("/status") && req.method === "PUT") {
      const parts = pathname.split("/").filter(Boolean);
      const orderId = parts[2];
      const body = await readBody(req);
      const payload = parseJson(body);
      const nextStatus = payload && payload.status;

      if (!["approved", "declined"].includes(nextStatus)) {
        return sendJson(res, 400, { message: 'Status must be "approved" or "declined".' });
      }

      const orders = readOrders();
      const orderIndex = orders.findIndex((order) => order.id === orderId);

      if (orderIndex === -1) {
        return sendJson(res, 404, { message: "Order not found." });
      }

      const updatedOrder = {
        ...orders[orderIndex],
        status: nextStatus,
        reviewedAt: new Date().toISOString()
      };

      orders[orderIndex] = updatedOrder;
      writeOrders(orders);
      return sendJson(res, 200, updatedOrder);
    }

    if (pathname === "/api/orders" && req.method === "DELETE") {
      writeOrders([]);
      return sendJson(res, 200, { message: "All order history deleted." });
    }

    if (pathname.startsWith("/api/orders/") && req.method === "DELETE") {
      const parts = pathname.split("/").filter(Boolean);
      const orderId = parts[2];
      const orders = readOrders();
      const nextOrders = orders.filter((order) => order.id !== orderId);

      if (nextOrders.length === orders.length) {
        return sendJson(res, 404, { message: "Order not found." });
      }

      writeOrders(nextOrders);
      return sendJson(res, 200, { message: `Order ${orderId} deleted.` });
    }

    return serveStaticFile(pathname, res);
  } catch (error) {
    const statusCode = error.message === "Invalid JSON body." ? 400 : 500;
    return sendJson(res, statusCode, { message: statusCode === 400 ? error.message : "Server error.", detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Conference backend running at http://localhost:${PORT}`);
});

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]\n", "utf8");
  }
}

function readOrders() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2) + "\n", "utf8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large."));
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseJson(body) {
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

function validateOrderPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "A JSON order payload is required.";
  }

  if (!String(payload.customerName || "").trim()) {
    return "Customer name is required.";
  }

  if (!String(payload.customerEmail || "").trim()) {
    return "Customer email is required.";
  }

  if (!String(payload.participation || "").trim()) {
    return "Participation type is required.";
  }

  if (!Array.isArray(payload.selectedProducts) || !payload.selectedProducts.length) {
    return "At least one selected product is required.";
  }

  return "";
}

function createOrderId() {
  return "ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function serveStaticFile(requestPath, res) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { message: "Forbidden." });
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Unable to load file");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
