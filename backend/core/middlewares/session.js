const Session = require('../models/sessions');
const User = require('../models/users');

const verifySession = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.session;

        if (!sessionId) {
            return res.status(401).json({
                message: 'You must be logged in to access this resource',
                error: 'No session found'
            });
        }

        // Find active session
        const session = await Session.findOne({
            sessionId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).exec();

        if (!session) {
            // Clear invalid cookie
            res.clearCookie('session', { path: '/' });
            return res.status(401).json({
                message: 'You must be logged in to access this resource',
                error: 'Invalid or expired session'
            });
        }

        // Find associated user
        const user = await User.findById(session.userId)
            .select('walletAddress walletAddressHash isActive')
            .lean()
            .exec();

        if (!user || !user.isActive) {
            // Deactivate session if user is not found or inactive
            session.isActive = false;
            await session.save();

            res.clearCookie('session', { path: '/' });
            return res.status(401).json({
                message: 'You must be logged in to access this resource',
                error: 'User not found or inactive'
            });
        }

        // Update session last accessed time
        session.lastAccessed = new Date();
        await session.save();

        // Attach user and session to request
        req.user = user;
        req.session = session;
        next();

    } catch (error) {
        console.error('Session verification error:', error);
        return res.status(500).json({
            message: 'Authentication error',
            error: 'Internal server error'
        });
    }
};

const optionalSession = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.session;

        if (sessionId) {
            const session = await Session.findOne({
                sessionId,
                isActive: true,
                expiresAt: { $gt: new Date() }
            }).exec();

            if (session) {
                const user = await User.findById(session.userId)
                    .select('walletAddress walletAddressHash isActive')
                    .lean()
                    .exec();

                if (user && user.isActive) {
                    // Update session last accessed time
                    session.lastAccessed = new Date();
                    await session.save();

                    req.user = user;
                    req.session = session;
                }
            }
        }

        next();
    } catch (error) {
        console.error('Optional session error:', error);
        // Don't fail the request, just continue without session
        next();
    }
};

const logout = async (req, res) => {
    try {
        if (req.session) {
            req.session.isActive = false;
            await req.session.save();
        }

        res.clearCookie('session', { path: '/' });
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.clearCookie('session', { path: '/' });
        return res.status(500).json({
            message: 'Logout failed',
            error: 'Internal server error'
        });
    }
};

module.exports = { verifySession, optionalSession, logout };
