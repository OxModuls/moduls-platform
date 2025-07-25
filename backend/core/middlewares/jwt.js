const jwt = require('jsonwebtoken');
const config = require('../../config');
const User = require('../models/users');

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'You must be logged in to access this resource', error: 'No token provided' });
    }


    try {

        const decoded = jwt.verify(token, config.jwtSecret);

        const user = await User.findById(decoded.userId).select('walletAddressHash isActive walletAddress ').lean();

        if (!user) {
            return res.status(401).json({ message: 'You must be logged in to access this resource', error: 'User not found' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'You must be logged in to access this resource', error: 'User is not active' });
        }

        req.user = {
            id: decoded.userId,
            walletAddress: user.walletAddress,
            walletAddressHash: user.walletAddressHash,
        }

        next();

    } catch (error) {
        return res.status(401).json({ message: 'You must be logged in to access this resource', error: error.message });
    }
}

module.exports = { verifyToken };