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
            timestamp: new Date().toISOString(), // Always send UTC for consistency
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

        // Enhanced SIWE message parsing with detailed error handling
        const parsedMessage = parseSIWEMessage(message);
        if (!parsedMessage.valid) {
            console.log('SIWE message parsing failed:', {
                error: parsedMessage.error,
                messageLength: message?.length,
                messagePreview: message?.substring(0, 100) + '...'
            });
            return res.status(400).json({
                message: 'Invalid SIWE message format',
                error: parsedMessage.error || 'Message format is invalid or corrupted',
                details: 'Please ensure the SIWE message follows the correct format'
            });
        }

        const { address, nonce } = parsedMessage;

        // Enhanced address validation
        let normalizedAddress;
        try {
            normalizedAddress = getAddress(address);
        } catch (error) {
            console.log('Address normalization failed:', { address, error: error.message });
            return res.status(400).json({
                message: 'Invalid wallet address in message',
                error: 'Address format is invalid',
                details: `Cannot process address: ${address}`
            });
        }

        const walletAddressHash = sha256(normalizedAddress);

        // Enhanced user lookup with better error messages
        const user = await User.findOne({ walletAddressHash }).exec();
        if (!user) {
            console.log('User not found for address:', normalizedAddress);
            return res.status(400).json({
                message: 'Wallet address not registered',
                error: 'No user found for this wallet address',
                details: 'Please ensure you have requested a nonce for this address'
            });
        }

        if (!user.nonce) {
            console.log('No nonce found for user:', normalizedAddress);
            return res.status(400).json({
                message: 'No nonce found',
                error: 'Please request a new nonce before signing',
                details: 'Authentication session may have been cleared'
            });
        }

        if (user.nonce !== nonce) {
            console.log('Nonce mismatch:', {
                expectedNonce: user.nonce,
                receivedNonce: nonce,
                address: normalizedAddress
            });
            return res.status(400).json({
                message: 'Nonce mismatch',
                error: 'The nonce in your message does not match our records',
                details: 'Please request a new nonce and sign again'
            });
        }

        // Enhanced nonce expiration check
        if (!user.nonceExpiresAt || user.nonceExpiresAt < new Date()) {
            const expiredTime = user.nonceExpiresAt ? new Date(user.nonceExpiresAt).toISOString() : 'unknown';
            console.log('Nonce expired:', {
                address: normalizedAddress,
                expiredAt: expiredTime,
                currentTime: new Date().toISOString()
            });
            return res.status(400).json({
                message: 'Nonce has expired',
                error: 'Your authentication session has timed out',
                details: `Nonce expired at ${expiredTime}. Please request a new nonce.`
            });
        }

        // Enhanced SIWE message validation
        const validation = validateSIWEMessage(parsedMessage, nonce);
        if (!validation.valid) {
            console.log('SIWE message validation failed:', {
                error: validation.error,
                address: normalizedAddress,
                nonce: nonce
            });
            return res.status(400).json({
                message: 'SIWE message validation failed',
                error: validation.error,
                details: 'The message format or timing requirements are not met'
            });
        }

        // Enhanced signature verification with detailed error reporting
        const signatureResult = await verifySIWESignature(message, signature, address);
        if (!signatureResult.valid) {
            console.log('Signature verification failed:', {
                error: signatureResult.error,
                address: normalizedAddress,
                signatureLength: signature?.length,
                signaturePrefix: signature?.substring(0, 10) + '...'
            });
            return res.status(400).json({
                message: 'Signature verification failed',
                error: signatureResult.error,
                details: 'The signature does not match the message and wallet address'
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
        console.error('Unexpected error during SIWE verification:', {
            error: error.message,
            stack: error.stack,
            requestBody: { hasMessage: !!req.body.message, hasSignature: !!req.body.signature }
        });

        // Provide different error responses based on error type
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Data validation error',
                error: error.message,
                details: 'The provided data failed validation checks'
            });
        }

        if (error.name === 'MongoError' || error.name === 'MongooseError') {
            return res.status(500).json({
                message: 'Database error',
                error: 'Unable to process authentication request',
                details: 'Please try again in a moment'
            });
        }

        return res.status(500).json({
            message: 'Authentication system error',
            error: 'An unexpected error occurred during verification',
            details: 'Please try again or contact support if the issue persists'
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
