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


const agentCreateSchema = z.object({
    // Basic agent info
    name: z.string().min(1, 'Agent name is required').max(100, 'Agent name must be less than 100 characters'),
    description: z.string().min(1, 'Agent description is required').max(1024, 'Agent description must be less than 1024 characters'),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
    telegramUrl: z.string().optional(),

    // Module and token info
    modulType: z.enum(['GAME_FI_NPC', 'DEFI_AI', 'MEME', 'ORACLE_FEED', 'CUSTOM'], {
        errorMap: () => ({ message: 'Invalid module type' })
    }),
    tokenSymbol: z.string().min(1, 'Token symbol is required').max(16, 'Token symbol must be less than 16 characters'),
    totalSupply: z.number().min(1, 'Total supply must be greater than 0'),

    // Tax settings (flattened)
    totalTaxPercentage: z.number().min(1, 'Total tax percentage must be at least 1%').max(10, 'Total tax percentage must be at most 10%'),
    agentWalletShare: z.number().min(1, 'Agent wallet share must be at least 1%').max(100, 'Agent wallet share must be at most 100%'),
    devWalletShare: z.number().min(1, 'Dev wallet share must be at least 1%').max(100, 'Dev wallet share must be at most 100%'),

    // Prebuy settings (flattened)
    slippage: z.number().min(1, 'Slippage must be at least 1%').max(100, 'Slippage must be at most 100%'),
    amountInWei: z.string().optional(),

    // Social links
    websiteUrl: z.string().optional(),
    twitterUrl: z.string().optional(),
});

// Response schema for agent data - filters and composes the response
const agentResponseSchema = z.object({
    uniqueId: z.string(),
    name: z.string(),
    description: z.string(),
    image: z.string().optional(),
    logoUrl: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE']),
    launchDate: z.date(),
    isVerified: z.boolean(),
    modulType: z.enum(['GAME_FI_NPC', 'DEFI_AI', 'MEME', 'ORACLE_FEED', 'CUSTOM']),
    tokenSymbol: z.string(),
    tokenDecimals: z.number(),
    totalSupply: z.number(),
    tokenAddress: z.string().optional(),
    taxSettings: z.object({
        totalTaxPercentage: z.number(),
        agentWalletShare: z.number(),
        devWalletShare: z.number(),
    }),
    prebuySettings: z.object({
        slippage: z.number(),
        amountInWei: z.string().optional(), // BigInt as string for JSON serialization
    }),
    telegramUrl: z.string().optional(),
    websiteUrl: z.string().optional(),
    twitterUrl: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    creator: z.object({
        walletAddress: z.string(),
    }).optional(),
});

module.exports = { walletLoginSchema, agentSchema, agentCreateSchema, agentResponseSchema };