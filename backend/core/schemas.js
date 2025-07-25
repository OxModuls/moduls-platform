const { isHex, isAddress } = require('viem');
const { z } = require('zod');


const walletLoginSchema = z.object({
    walletAddress: z.string().refine(isAddress, { message: 'Invalid wallet address' }),
    signature: z.string().refine(isHex, { message: 'Invalid signature' }),
    message: z.string().min(10).max(1024),
});

module.exports = { walletLoginSchema };