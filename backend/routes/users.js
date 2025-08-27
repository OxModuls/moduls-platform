const router = require('express').Router();
const { sha256, getAddress } = require("viem")
const User = require("../core/models/users");
const Agent = require("../core/models/agents");
const config = require('../config');

const { verifySession, logout } = require('../core/middlewares/session');
const { parseSIWEMessage, verifySIWESignature } = require('../core/utils/siwe');
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

        const { address } = parsedMessage;

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
        let user = await User.findOne({ walletAddressHash }).exec();
        if (!user) {
            // Create new user if they don't exist
            user = new User({
                walletAddress: getAddress(address),
                walletAddressHash,
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

        const cookieOptions = {
            httpOnly: true,
            secure: config.env === 'production',
            sameSite: config.env === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',

        };

        console.log(`🍪 [Cookie] Setting session cookie:`, {
            sessionId: sessionId.substring(0, 8) + '...',
            options: cookieOptions,
            userAgent: req.headers['user-agent']?.substring(0, 50) + '...',
            isMobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'] || ''),
            secure: req.secure,
            host: req.headers.host
        });

        res.cookie('session', sessionId, cookieOptions);

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
            message: 'Internal server error',
            error: 'An unexpected error occurred',
            details: 'Please try again in a moment'
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

router.get("/search", async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                message: 'Search query must be at least 2 characters',
                error: 'Invalid search query'
            });
        }

        const searchQuery = q.trim();
        const searchLimit = Math.min(parseInt(limit) || 20, 50);

        const searchConditions = {
            $and: [
                { status: 'ACTIVE' },
                {
                    $or: [
                        { name: { $regex: searchQuery, $options: 'i' } },
                        { tokenSymbol: { $regex: searchQuery, $options: 'i' } },
                        { tokenAddress: { $regex: searchQuery, $options: 'i' } },
                        { description: { $regex: searchQuery, $options: 'i' } }
                    ]
                }
            ]
        };

        const agents = await Agent.find(searchConditions)
            .select('uniqueId name description tokenSymbol tokenAddress launchDate image logoUrl')
            .limit(searchLimit)
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        return res.status(200).json({
            success: true,
            query: searchQuery,
            count: agents.length,
            results: agents
        });

    } catch (error) {
        console.error('Error searching agents:', error);
        return res.status(500).json({
            message: 'Search failed',
            error: 'Internal server error'
        });
    }
});

module.exports = router;
