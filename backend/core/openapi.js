const { createDocument } = require('zod-openapi');
const { walletLoginSchema } = require('./schemas');

const openApiDoc = createDocument({
    openapi: '3.0.0',
    info: {
        title: 'Moduls API',
        version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:8000' }],
    components: {
        schemas: {
            walletLogin: walletLoginSchema,
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
    },
});

module.exports = { openApiDoc };