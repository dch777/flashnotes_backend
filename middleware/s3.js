const AWS = require("aws-sdk");
AWS.config.region = process.env.REGION || "us-east-1";
const s3 = new AWS.S3();

module.exports = (req, res, next) => {
	req.s3 = s3;
	next();
};
