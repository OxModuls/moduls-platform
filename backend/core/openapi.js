const { createDocument } = require('zod-openapi');
const { walletLoginSchema, agentSchema } = require('./schemas');

const openApiDoc = createDocument({
    openapi: '3.0.0',
    info: {
        title: 'Moduls API',
        version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:8000' }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            walletLogin: walletLoginSchema,
            agent: agentSchema,
        },
    },
    paths: {
        '/api/auth/wallet-login': {
            post: {
                summary: 'Login with wallet',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: walletLoginSchema,
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Login successful',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        token: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api/stats': {
            get: {
                summary: 'Get active users and agents count',
                responses: {
                    200: {
                        description: 'Active users and agents count',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        activeUsersCount: { type: 'number' },
                                        activeAgentsCount: { type: 'number' },
                                    },

                                },
                            },
                        },
                    },
                },
            },
        },

        '/api/agents/mine': {
            get: {
                summary: 'Get user agents',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'User agents',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        agents: { type: 'array', items: { type: 'object', ref: 'agent' } },
                                    },
                                    required: ['agents'],
                                },
                            },
                        },
                    },
                },
            },
        },

        '/api/agents/create': {
            post: {
                summary: 'Create agent',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: agentSchema,
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Agent created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        agent: { type: 'object', ref: 'agent' },
                                    },
                                    required: ['agent'],
                                },
                            },
                        },
                    },
                },
            },
        },
    },
});

module.exports = { openApiDoc };