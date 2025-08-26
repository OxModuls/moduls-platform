const crypto = require('crypto');
const { isAddress, getAddress, recoverMessageAddress } = require('viem');

function createSIWEMessage(address, timestamp, chainId = 1328, domain = 'www.moduls.fun') {
    const uri = `https://${domain}`;
    const issuedAt = new Date(timestamp).toISOString();

    return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to Moduls with your wallet

URI: ${uri}
Version: 1
Chain ID: ${chainId}
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

        // Extract issued at timestamp
        const issuedAtMatch = message.match(/Issued At: (.+)/);
        const issuedAt = issuedAtMatch ? issuedAtMatch[1] : null;

        // Extract URI
        const uriMatch = message.match(/URI: (.+)/);
        const uri = uriMatch ? uriMatch[1] : null;

        return {
            domain,
            address,
            issuedAt,
            uri,
            valid: !!(domain && address && issuedAt && isAddress(address))
        };
    } catch (error) {
        return {
            domain: null,
            address: null,
            issuedAt: null,
            uri: null,
            valid: false,
            error: error.message
        };
    }
}

async function verifySIWESignature(message, signature, expectedAddress) {
    try {
        if (!signature || typeof signature !== 'string') {
            return { valid: false, error: 'Invalid signature format' };
        }

        if (!message || typeof message !== 'string') {
            return { valid: false, error: 'Invalid message format' };
        }

        if (!expectedAddress) {
            return { valid: false, error: 'Expected address is required' };
        }

        const recoveredAddress = await recoverMessageAddress({
            message,
            signature
        });

        const normalizedRecovered = getAddress(recoveredAddress);
        const normalizedExpected = getAddress(expectedAddress);

        const isValid = normalizedRecovered === normalizedExpected;

        if (!isValid) {
            return {
                valid: false,
                error: `Address mismatch: signature from ${normalizedRecovered}, expected ${normalizedExpected}`
            };
        }

        return { valid: true };
    } catch (error) {
        console.log('Signature verification error:', error.message);

        // Provide specific error messages based on error type
        if (error.message?.includes('Invalid signature')) {
            return { valid: false, error: 'Invalid signature format or encoding' };
        }

        if (error.message?.includes('hex')) {
            return { valid: false, error: 'Signature must be a valid hex string' };
        }

        if (error.message?.includes('length')) {
            return { valid: false, error: 'Signature has incorrect length' };
        }

        return {
            valid: false,
            error: `Signature verification failed: ${error.message}`
        };
    }
}

module.exports = {
    createSIWEMessage,
    parseSIWEMessage,
    verifySIWESignature
};
