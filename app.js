const cluster = require("cluster");

if (cluster.isMaster) {
	const cpuCount = require("os").cpus().length;

	for (var i = 0; i < cpuCount; i += 1) {
		cluster.fork();
	}

	cluster.on("exit", function (worker) {
		console.log("Worker " + worker.id + " died :(");
		cluster.fork();
	});
} else {
	const express = require("express");
	const cookieParser = require("cookie-parser");

	const withDDB = require("./middleware/ddb");
	const auth = require("./routers/auth");

	const app = express();
	app.use(cookieParser());
	app.use(express.json());
	app.use(withDDB);
	const http = require("http").Server(app);

	app.get("/", (req, res) => {
		res.send("Flashnotes API");
	});
	app.use("/auth/", auth);

	const port = process.env.PORT || 5000;
	http.listen(port, function () {
		console.log(`[${process.pid}] Listening on port ${port}`);
	});
}
