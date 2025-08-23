/**
 * Create a SIWE (Sign-In with Ethereum) message
 */
export function createSIWEMessage(address, nonce, chainId = 1328, domain = 'www.moduls.fun') {
    const uri = `https://${domain}`;
    const issuedAt = new Date().toISOString();

    return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to Moduls with your wallet

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;
}

/**
 * Parse a SIWE message to extract components
 */
export function parseSIWEMessage(message) {
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

        return {
            domain,
            address,
            nonce,
            issuedAt,
            valid: !!(domain && address && nonce && issuedAt)
        };
    } catch (error) {
        return {
            domain: null,
            address: null,
            nonce: null,
            issuedAt: null,
            valid: false,
            error: error.message
        };
    }
}
