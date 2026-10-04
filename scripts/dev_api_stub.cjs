const http = require("node:http");

const server = http.createServer((req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "*");
	res.setHeader("Content-Type", "application/json");

	if (req.method === "OPTIONS") {
		res.writeHead(204);
		return res.end();
	}

	if (req.url === "/api/health") {
		res.writeHead(200);
		return res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
	}

	if (req.url === "/api/auth/user/me") {
		res.writeHead(200);
		return res.end(JSON.stringify({ id: "doc-1", role: "owner", fullName: "Д-р Воронов" }));
	}

	res.writeHead(200);
	res.end(JSON.stringify({ success: true, url: req.url }));
});

server.listen(4100, "127.0.0.1", () => {
	console.log("Mock API server listening on http://127.0.0.1:4100");
});
