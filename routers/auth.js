const express = require("express");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { getUserByEmail, getUserByJWT } = require("../middleware/auth.js");

const authRouter = express.Router();
const authTable = "flashnotes-auth";
const notesBucket = "flashnotes";

authRouter.post("/signup", getUserByEmail, (req, res) => {
	const ddb = req.ddb;
	const uuid = uuidv4();
	const { email, username, password, phone } = req.body;

	if (!req.user) {
		const signUp = {
			TableName: authTable,
			Item: {
				uuid: { S: uuid },
				email: { S: email },
				username: { S: username },
				password: { S: password },
				notes: { L: [] },
			},
		};

		ddb.putItem(signUp, (err, data) => {
			if (err) {
				console.error(`[${process.pid}] ${err}`);
				res.status(500).send("Server error");
			} else res.status(200).send("User created");
		});
	} else {
		res.status(403).send({ error: "User Exists" });
	}
});

authRouter.post("/login", getUserByEmail, (req, res) => {
	const { password } = req.body;

	if (!req.user) {
		res.status(401).send({
			error: "Account does not exist",
		});
	} else if (req.user.password.S === password) {
		const payload = req.user.uuid;
		const token = jwt.sign({ payload }, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});

		res.cookie("token", token, { httpOnly: true }).sendStatus(200);
	} else {
		res.status(401).send({
			error: "Incorrect email or password",
		});
	}
});

authRouter.get("/logout", getUserByJWT, (req, res) => {
	res
		.cookie("token", "", { httpOnly: true, expires: new Date() })
		.sendStatus(200);
});

authRouter.get("/data", getUserByJWT, (req, res) => {
	res.status(200).send(req.user);
});

authRouter.post("/create", getUserByJWT), (req, res) => {
	const ddb = req.ddb;
	const note_id = uuidv4();

	const createNoteParams = {
		TableName: authTable,
		Key: {
			uuid: { S: uuid },
		},
		UpdateExpression: "SET notes = list_append(notes, :c)",
		ExpressionAttributeValues: {
			":c": { L: [{ S: note_id }] },
		},
		ReturnValues: "ALL_NEW",
	};

	s3.putObject({
		Bucket: notesBucket,
		Key: note_id,
		Body: req.files.note.data,
		ACL: 'public-read'
	}, function (err, data) {
		if (err) {
			console.error(`[${process.pid}] ${err}`);
			res.status(500).send({ error: "Server Error" });
		}
	});

	ddb.updateItem(createNoteParams, (err, data) => {
		if (err) {
			console.error(`[${process.pid}] ${err}`);
			res.status(500).send({ error: "Server Error" });
		} else if (data.Attributes) {
			res.status(200).send("Note created");
		} else {
			res.status(401).send({ error: "Not found" });
		}
	})
});

module.exports = authRouter;
