const router = require('express').Router();
const { sha256, recoverMessageAddress, getAddress } = require("viem")
const User = require("../core/models/users");
const Agent = require("../core/models/agents");
const jwt = require('jsonwebtoken');
const config = require('../config');

const { verifyToken } = require('../core/middlewares/jwt');







router.get("/agents/mine", verifyToken, async (req, res) => {
    const { userId } = req.user;
    const agents = await Agent.find({ userId }).exec();
    return res.status(200).json({ agents });
});


module.exports = router;