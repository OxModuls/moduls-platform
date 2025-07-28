const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { getAddress } = require('viem');
const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const deriveEncryptionKey = (password, salt = 'moduls-encryption-salt') => {
    return crypto.pbkdf2Sync(password, salt, 100000, ENCRYPTION_KEY_LENGTH, 'sha256');
};

const encryptString = (text, password) => {
    try {
        const key = deriveEncryptionKey(password);
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
        cipher.setAAD(Buffer.from('moduls-auth-data', 'utf8'));

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();
        const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);

        return combined.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

const decryptString = (encryptedText, password) => {
    try {
        const key = deriveEncryptionKey(password);
        const combined = Buffer.from(encryptedText, 'base64');

        const iv = combined.subarray(0, IV_LENGTH);
        const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
        const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
        decipher.setAAD(Buffer.from('moduls-auth-data', 'utf8'));
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
};

const encryptPrivateKey = (privateKey, password) => {
    return encryptString(privateKey, password);
};

const decryptPrivateKey = (encryptedPrivateKey, password) => {
    return decryptString(encryptedPrivateKey, password);
};

const createEncryptedWalletAccount = (password) => {
    try {
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);
        const encryptedPrivateKey = encryptPrivateKey(privateKey, password);

        return {
            encryptedPrivateKey,
            address: account.address,
            type: account.type,
            publicKey: account.publicKey,
        };
    } catch (error) {
        console.error('Error creating encrypted wallet account:', error);
        throw new Error('Failed to create encrypted wallet account');
    }
};

const loadWalletFromEncryptedPrivateKey = (encryptedPrivateKey, password) => {
    try {
        const privateKey = decryptPrivateKey(encryptedPrivateKey, password);
        return loadWalletFromPrivateKey(privateKey);
    } catch (error) {
        console.error('Error loading wallet from encrypted private key:', error);
        throw new Error('Failed to load wallet from encrypted private key');
    }
};

const createWalletAccount = () => {
    try {
        const privateKey = generatePrivateKey();
        const account = privateKeyToAccount(privateKey);

        return {
            privateKey,
            address: account.address,
            type: account.type,
            publicKey: account.publicKey,
        };
    } catch (error) {
        console.error('Error creating wallet account:', error);
        throw new Error('Failed to create wallet account');
    }
};

const loadWalletFromPrivateKey = (privateKey) => {
    try {
        const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        const account = privateKeyToAccount(formattedPrivateKey);

        return {
            address: account.address,
            type: account.type,
            publicKey: account.publicKey,
            account
        };
    } catch (error) {
        console.error('Error loading wallet from private key:', error);
        throw new Error('Invalid private key or failed to load wallet');
    }
};

const isValidAddress = (address) => {
    try {
        getAddress(address);
        return true;
    } catch {
        return false;
    }
};

const normalizeAddress = (address) => {
    try {
        return getAddress(address);
    } catch (error) {
        throw new Error('Invalid Ethereum address');
    }
};

module.exports = {
    createWalletAccount,
    loadWalletFromPrivateKey,
    isValidAddress,
    normalizeAddress,
    encryptString,
    decryptString,
    encryptPrivateKey,
    decryptPrivateKey,
    createEncryptedWalletAccount,
    loadWalletFromEncryptedPrivateKey
};
