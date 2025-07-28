const { isHex, isAddress } = require('viem');
const { z } = require('zod');


const walletLoginSchema = z.object({
    walletAddress: z.string().refine(isAddress, { message: 'Invalid wallet address' }),
    signature: z.string().refine(isHex, { message: 'Invalid signature' }),
    message: z.string().min(10).max(1024),
});


const agentSchema = z.object({
    uniqueId: z.string().min(1).max(100),
    intentId: z.string().min(1).max(100),
    tokenSymbol: z.string().min(1).max(100),
    tokenAddress: z.string().min(1).max(100),
    tokenDecimals: z.number().min(1).max(100),
    tokenTotalSupply: z.number().min(1).max(100),
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(1024),
    image: z.string().min(1).max(1024),
    tags: z.array(z.string()).min(1).max(10),
    telegramUrl: z.string().min(1).max(1024).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'READY']),
    launchDate: z.date(),
    isVerified: z.boolean(),
    creator: z.string().min(1).max(100),
});

module.exports = { walletLoginSchema, agentSchema };