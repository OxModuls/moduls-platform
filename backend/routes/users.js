const router = require('express').Router();
const { sha256, recoverMessageAddress, getAddress } = require("viem")
const User = require("../core/models/users");
const jwt = require('jsonwebtoken');
const config = require('../config');
const { walletLoginSchema } = require('../core/schemas');






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










module.exports = router;