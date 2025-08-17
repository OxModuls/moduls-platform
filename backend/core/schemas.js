const { z } = require('zod');


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
    modulType: z.enum(['GAMING_BUDDY', 'TRADING_ASSISTANT', 'MEME', 'PORTFOLIO_WATCHER', 'SOCIAL_SENTINEL', 'GAME_FI_NPC', 'DEFI_AI', 'ORACLE_FEED'], {
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

    // Launch schedule
    launchDate: z.date()
        .optional()
        .refine(
            (date) => {
                if (!date) return true; // allow optional
                const now = new Date();
                return date.getTime() - now.getTime() >= 2 * 60 * 1000; // at least 2 mins from now
            },
            { message: "Launch date must be at least 2 minutes from now" }
        ),
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
    modulType: z.enum(['GAMING_BUDDY', 'TRADING_ASSISTANT', 'MEME', 'PORTFOLIO_WATCHER', 'SOCIAL_SENTINEL', 'GAME_FI_NPC', 'DEFI_AI', 'ORACLE_FEED']),
    tokenSymbol: z.string(),
    tokenDecimals: z.number(),
    totalSupply: z.number(),
    tokenAddress: z.string().optional(),
    walletAddress: z.string().optional(),
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
    launchDate: z.date().optional(),
});

// Chat schemas
const threadCreateSchema = z.object({
    agentId: z.string().min(1, 'Agent ID is required'),
    title: z.string().min(1, 'Thread title is required').max(200, 'Thread title must be less than 200 characters').optional(),
    tags: z.array(z.string()).optional(),
});

const threadUpdateSchema = z.object({
    title: z.string().min(1, 'Thread title is required').max(200, 'Thread title must be less than 200 characters').optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional(),
    isPinned: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
});

const messageCreateSchema = z.object({
    threadId: z.string().min(1, 'Thread ID is required'),
    content: z.string().min(1, 'Message content is required').max(10000, 'Message content must be less than 10000 characters'),
    parentMessageId: z.string().optional(),
    messageType: z.enum(['text', 'image', 'file', 'command']).default('text'),
    metadata: z.record(z.any()).optional(),
});

const messageUpdateSchema = z.object({
    content: z.string().min(1, 'Message content is required').max(10000, 'Message content must be less than 10000 characters').optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    error: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

const threadResponseSchema = z.object({
    uniqueId: z.string(),
    agentId: z.string(),
    userId: z.string(),
    userWalletAddress: z.string(),
    title: z.string(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']),
    messageCount: z.number(),
    lastMessageAt: z.date(),
    isPinned: z.boolean(),
    tags: z.array(z.string()),
    createdAt: z.date(),
    updatedAt: z.date(),
});

const messageResponseSchema = z.object({
    uniqueId: z.string(),
    threadId: z.string(),
    agentId: z.string(),
    userId: z.string(),
    parentMessageId: z.string().nullable(),
    content: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    messageType: z.enum(['text', 'image', 'file', 'command']),
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    model: z.string().nullable(),
    tokens: z.number().nullable(),
    responseTime: z.number().nullable(),
    error: z.string().nullable(),
    metadata: z.record(z.any()),
    createdAt: z.date(),
    updatedAt: z.date(),
});

module.exports = {
    agentSchema,
    agentCreateSchema,
    agentResponseSchema,
    threadCreateSchema,
    threadUpdateSchema,
    messageCreateSchema,
    messageUpdateSchema,
    threadResponseSchema,
    messageResponseSchema
};