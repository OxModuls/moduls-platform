const router = require('express').Router();
const { sha256, getAddress } = require("viem")
const User = require("../core/models/users");
const Agent = require("../core/models/agents");
const config = require('../config');

const { verifySession, logout } = require('../core/middlewares/session');
const { generateNonce, parseSIWEMessage, verifySIWESignature, validateSIWEMessage } = require('../core/utils/siwe');
const Session = require('../core/models/sessions');
const crypto = require('crypto');

router.get("/stats", async (req, res) => {
    const usersCount = await User.countDocuments({
        isActive: true
    }).exec();
    const agentsCount = await Agent.countDocuments({}).exec();
    return res.status(200).json({
        activeUsersCount: usersCount,
        activeAgentsCount: agentsCount
    });
});

router.get("/auth/nonce", async (req, res) => {
    try {
        const { address } = req.query;

        if (!address || !getAddress(address)) {
            return res.status(400).json({
                message: 'Valid wallet address is required',
                error: 'Invalid address parameter'
            });
        }

        const nonce = generateNonce();
        const nonceExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const walletAddressHash = sha256(getAddress(address));

        let user = await User.findOne({ walletAddressHash }).exec();

        if (!user) {
            user = new User({
                walletAddress: getAddress(address),
                walletAddressHash,
                nonce,
                nonceExpiresAt,
            });
        } else {
            user.nonce = nonce;
            user.nonceExpiresAt = nonceExpiresAt;
        }

        await user.save();

        return res.status(200).json({
            nonce,
            timestamp: Date.now(),
            address: getAddress(address),
            expiresAt: nonceExpiresAt.toISOString()
        });

    } catch (error) {
        console.error('Error generating nonce:', error);
        return res.status(500).json({
            message: 'Failed to generate nonce',
            error: 'Internal server error'
        });
    }
});

router.post("/auth/verify", async (req, res) => {
    try {
        const { message, signature } = req.body;

        if (!message || !signature) {
            return res.status(400).json({
                message: 'Message and signature are required',
                error: 'Missing required fields'
            });
        }

        const parsedMessage = parseSIWEMessage(message);
        if (!parsedMessage.valid) {
            return res.status(400).json({
                message: 'Invalid SIWE message format',
                error: parsedMessage.error || 'Invalid message'
            });
        }

        const { address, nonce } = parsedMessage;
        const walletAddressHash = sha256(getAddress(address));

        const user = await User.findOne({ walletAddressHash }).exec();
        if (!user || !user.nonce || user.nonce !== nonce) {
            return res.status(400).json({
                message: 'Invalid or expired nonce',
                error: 'Nonce verification failed'
            });
        }

        if (!user.nonceExpiresAt || user.nonceExpiresAt < new Date()) {
            return res.status(400).json({
                message: 'Nonce has expired',
                error: 'Please request a new nonce'
            });
        }

        const validation = validateSIWEMessage(parsedMessage, nonce);
        if (!validation.valid) {
            return res.status(400).json({
                message: 'SIWE message validation failed',
                error: validation.error
            });
        }

        const isValidSignature = await verifySIWESignature(message, signature, address);
        if (!isValidSignature) {
            return res.status(400).json({
                message: 'Invalid signature',
                error: 'Signature verification failed'
            });
        }

        user.nonce = null;
        user.nonceExpiresAt = null;
        user.lastLogin = new Date();
        await user.save();

        const sessionId = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const session = new Session({
            sessionId,
            userId: user._id,
            walletAddress: getAddress(address),
            expiresAt,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress,
        });

        await session.save();

        res.cookie('session', sessionId, {
            httpOnly: true,
            secure: config.env === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                walletAddress: user.walletAddress,
                isActive: user.isActive
            }
        });

    } catch (error) {
        console.error('Error verifying SIWE:', error);
        return res.status(500).json({
            message: 'Verification failed',
            error: 'Internal server error'
        });
    }
});

router.get("/auth/user", verifySession, async (req, res) => {
    try {
        const user = req.user;
        return res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.post("/auth/logout", verifySession, async (req, res) => {
    return await logout(req, res);
});

module.exports = router;
