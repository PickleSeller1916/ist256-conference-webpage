const http = require("http");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const PORT = Number(process.env.PORT) || 3001;
const PUBLIC_DIR = __dirname;

// Database Connection
mongoose.connect('mongodb://localhost:27017/conferenceDB')
  .then(() => console.log("Connected to MongoDB..."))
  .catch(err => console.error("Could not connect to MongoDB...", err));

// Mongoose Schemas
const memberSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: String,
  org: String,
  phone: String
});

const orderSchema = new mongoose.Schema({
  orderId: String,
  customerName: String,
  customerEmail: String,
  participation: String,
  totalAmount: Number,
  status: { type: String, default: "Pending" },
  selectedProducts: Array,
  createdAt: { type: Date, default: Date.now }
});

const Member = mongoose.model("Member", memberSchema);
const Order = mongoose.model("Order", orderSchema);

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
    // API: GET All Orders
    if (pathname === "/api/orders" && req.method === "GET") {
      const orders = await Order.find().sort({ createdAt: -1 });
      return sendJson(res, 200, orders);
    }

    // API: GET Pending Orders
    if (pathname === "/api/orders/pending" && req.method === "GET") {
      const pending = await Order.find({ status: "Pending" });
      return sendJson(res, 200, pending);
    }

    // API: POST New Order
    if (pathname === "/api/orders" && req.method === "POST") {
      const body = await getRequestBody(req);
      const payload = JSON.parse(body);
      const newOrder = new Order({
        orderId: createOrderId(),
        customerName: payload.name,
        customerEmail: payload.email,
        participation: payload.participation,
        totalAmount: payload.totalAmount,
        selectedProducts: payload.selectedProducts
      });
      await newOrder.save();
      return sendJson(res, 201, newOrder);
    }

    // API: PUT Update Status
    if (pathname.startsWith("/api/orders/") && pathname.endsWith("/status") && req.method === "PUT") {
      const orderId = pathname.split("/")[3];
      const body = await getRequestBody(req);
      const { status } = JSON.parse(body);
      const updated = await Order.findOneAndUpdate({ orderId }, { status }, { new: true });
      return sendJson(res, 200, updated);
    }

    // API: DELETE Order
    if (pathname.startsWith("/api/orders/") && req.method === "DELETE") {
      const orderId = pathname.split("/")[3];
      await Order.deleteOne({ orderId });
      return sendJson(res, 200, { message: "Deleted" });
    }

    // API: POST New Member
    if (pathname === "/api/members" && req.method === "POST") {
      const body = await getRequestBody(req);
      const payload = JSON.parse(body);
      const newMember = new Member(payload);
      await newMember.save();
      return sendJson(res, 201, newMember);
    }

    // Static File Serving
    serveStaticFile(pathname, res);

  } catch (error) {
    console.error("Server Error:", error);
    sendJson(res, 500, { message: "Internal Server Error", error: error.message });
  }
});

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => body += chunk.toString());
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function createOrderId() {
  return "ORD-" + Date.now().toString(36).toUpperCase();
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function serveStaticFile(requestPath, res) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
    res.end(content);
  });
}

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
