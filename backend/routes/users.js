const router = require('express').Router();
const { sha256, recoverMessageAddress, getAddress } = require("viem")
const User = require("../core/models/users");
const jwt = require('jsonwebtoken');
const Agent = require("../core/models/agents");
const config = require('../config');
const { walletLoginSchema } = require('../core/schemas');

const { verifyToken } = require('../core/middlewares/jwt');





router.get("/stats", async (req, res) => {
    // count of users, and active agenst 
    const usersCount = await User.countDocuments({
        isActive: true
    }).exec();
    const agentsCount = await Agent.countDocuments({
        // status: "ACTIVE"
    }).exec();
    return res.status(200).json({

        activeUsersCount: usersCount,
        activeAgentsCount: agentsCount

    });
});



router.post("/auth/wallet-login", async (req, res) => {
    const parsed = walletLoginSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid request', error: parsed.error.flatten() });
    }

    const { walletAddress, signature, message } = parsed.data;

    const recoveredAddress = await recoverMessageAddress({
        message,
        signature
    });

    if (getAddress(recoveredAddress) !== getAddress(walletAddress)) {
        return res.status(400).json({ message: 'Invalid signature', error: 'Invalid signature' });
    }



    const walletAddressHash = sha256(getAddress(walletAddress));



    let user = await User.findOne({ walletAddressHash }).exec();



    if (!user) {



        const newUser = new User({
            walletAddress: getAddress(walletAddress),
            walletAddressHash,
        });

        await newUser.save();

        user = newUser;


    }

    const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: config.jwtExpiration });

    return res.status(200).json({ token });







});


router.get("/auth/user", verifyToken, async (req, res) => {
    try {
        const user = req.user;

        return res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});










module.exports = router;