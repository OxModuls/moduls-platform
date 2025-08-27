const Session = require('../models/sessions');
const User = require('../models/users');

const verifySession = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.session;

        if (!sessionId) {
            console.log(`🔒 [Session] 401 - No session cookie found for ${req.method} ${req.url}`);
            return res.status(401).json({
                message: 'You must be logged in to access this resource',
                error: 'No session found'
            });
        }

        console.log(`🔍 [Session] Verifying session: ${sessionId.substring(0, 8)}... for ${req.method} ${req.url}`);

        // Find active session
        const session = await Session.findOne({
            sessionId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).exec();

        if (!session) {
            console.log(`❌ [Session] 401 - Session not found or expired: ${sessionId.substring(0, 8)}... for ${req.method} ${req.url}`);
            // Clear invalid cookie
            res.clearCookie('session', {
                path: '/',
                domain: process.env.NODE_ENV === 'production' ? '.moduls.fun' : undefined
            });
            return res.status(401).json({
                message: 'You must be logged in to access this resource',
                error: 'Invalid or expired session'
            });
        }

        console.log(`✅ [Session] Session found, expires at: ${session.expiresAt.toISOString()}`);

        // Find associated user
        const user = await User.findById(session.userId)
            .select('walletAddress walletAddressHash isActive')
            .lean()
            .exec();

        if (!user) {
            console.log(`❌ [Session] 401 - User not found for session ${sessionId.substring(0, 8)}..., userId: ${session.userId} for ${req.method} ${req.url}`);
            // Deactivate session if user is not found
            session.isActive = false;
            await session.save();

            res.clearCookie('session', {
                path: '/',
            });
            return res.status(401).json({
                message: 'You must be logged in to access this resource',
                error: 'User not found'
            });
        }

        if (!user.isActive) {
            console.log(`❌ [Session] 401 - User inactive for session ${sessionId.substring(0, 8)}..., wallet: ${user.walletAddress} for ${req.method} ${req.url}`);
            // Deactivate session if user is inactive
            session.isActive = false;
            await session.save();

            res.clearCookie('session', {
                path: '/'
            });
            return res.status(401).json({
                message: 'You must be logged in to access this resource',
                error: 'User account inactive'
            });
        }

        console.log(`✅ [Session] User verified: ${user.walletAddress} (${user.isActive ? 'active' : 'inactive'})`);

        // Update session last accessed time
        session.lastAccessed = new Date();
        await session.save();

        // Attach user and session to request
        req.user = user;
        req.session = session;
        next();

    } catch (error) {
        console.error(`❌ [Session] 500 - Session verification error for ${req.method} ${req.url}:`, error);
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

    console.log('🔒 [Session] Logging out user:', req.user.walletAddress);
    try {
        if (req.session) {
            req.session.isActive = false;
            await req.session.save();
        }

        res.clearCookie('session', {
            path: '/',
        });
        console.log('🔒 [Session] Logged out user:', req.user.walletAddress);
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.clearCookie('session', {
            path: '/',
        });
        return res.status(500).json({
            message: 'Logout failed',
            error: 'Internal server error'
        });
    }
};

module.exports = { verifySession, optionalSession, logout };
