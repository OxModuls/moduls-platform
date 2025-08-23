const crypto = require('crypto');
const { isAddress, getAddress, recoverMessageAddress } = require('viem');

function generateNonce() {
    return crypto.randomBytes(16).toString('hex');
}

function createSIWEMessage(address, nonce, timestamp, chainId = 1328, domain = 'www.moduls.fun') {
    const uri = `https://${domain}`;
    const issuedAt = new Date(timestamp).toISOString();

    return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to Moduls with your wallet

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;
}

function parseSIWEMessage(message) {
    try {
        const lines = message.split('\n');

        // Extract domain (first line before " wants you to sign in")
        const domainMatch = lines[0].match(/^(.+?) wants you to sign in/);
        const domain = domainMatch ? domainMatch[1] : null;

        // Extract address (second line)
        const address = lines[1];

        // Extract nonce
        const nonceMatch = message.match(/Nonce: (.+)/);
        const nonce = nonceMatch ? nonceMatch[1] : null;

        // Extract issued at timestamp
        const issuedAtMatch = message.match(/Issued At: (.+)/);
        const issuedAt = issuedAtMatch ? issuedAtMatch[1] : null;

        // Extract URI
        const uriMatch = message.match(/URI: (.+)/);
        const uri = uriMatch ? uriMatch[1] : null;

        return {
            domain,
            address,
            nonce,
            issuedAt,
            uri,
            valid: !!(domain && address && nonce && issuedAt && isAddress(address))
        };
    } catch (error) {
        return {
            domain: null,
            address: null,
            nonce: null,
            issuedAt: null,
            uri: null,
            valid: false,
            error: error.message
        };
    }
}

async function verifySIWESignature(message, signature, expectedAddress) {
    try {
        const recoveredAddress = await recoverMessageAddress({
            message,
            signature
        });

        return getAddress(recoveredAddress) === getAddress(expectedAddress);
    } catch (error) {
        return false;
    }
}

function validateSIWEMessage(parsedMessage, expectedNonce, maxAge = 5 * 60 * 1000) {
    if (!parsedMessage.valid) {
        return { valid: false, error: 'Invalid message format' };
    }

    if (parsedMessage.nonce !== expectedNonce) {
        return { valid: false, error: 'Invalid nonce' };
    }

    const issuedAt = new Date(parsedMessage.issuedAt);
    const now = new Date();
    const ageMs = now - issuedAt;

    if (ageMs > maxAge) {
        return { valid: false, error: 'Message too old' };
    }

    if (ageMs < -60000) {
        return { valid: false, error: 'Message from future' };
    }

    return { valid: true };
}

module.exports = {
    generateNonce,
    createSIWEMessage,
    parseSIWEMessage,
    verifySIWESignature,
    validateSIWEMessage
};
