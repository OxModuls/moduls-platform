require('dotenv').config({
    path: '.env.local'
});

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./core/db');
const usersRouter = require('./routes/users');
const agentsRouter = require('./routes/agents');
const fs = require('fs');
const path = require('path');
const { openApiDoc } = require('./core/openapi');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');

// Import new webhook system
const webhookRoutes = require('./core/webhooks/routes');
const WebhookHandler = require('./core/webhooks/webhook-handler');

// Import event listening system
const { listenAndProcessOnchainEvents, stopEventListening } = require('./core/events');

const app = express();

// CONFIG
app.set("port", config.port);

// MIDDLEWARES
if (config.isDev) {
    app.use(morgan('dev'));
} else {
    const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
    app.use(morgan('combined', { stream: accessLogStream }));
}

// Increase body parser limits for webhook payloads
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Simple cookie parser middleware
app.use((req, res, next) => {
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                req.cookies[name] = decodeURIComponent(value);
            }
        });
    }
    next();
});

app.use(cors({
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// WEBHOOK HANDLER
let webhookHandler;

// EVENT LISTENER
let eventUnwatch;

// ROUTES
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));
app.use('/api', usersRouter);
app.use('/api', agentsRouter);

// New webhook routes
app.use('/api/webhooks', webhookRoutes);

// ERROR HANDLER
app.use((err, req, res, next) => {
    console.table({
        error: err,
        message: err.message,
        stack: err.stack,
        status: err.status,
        timestamp: new Date().toISOString(),
    });
    res.status(500).send('An unexpected error occurred');
});

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(app.get("port"), async () => {
    await connectDB();

    // Initialize new webhook handler
    // try {
    //     webhookHandler = WebhookHandler.getInstance();
    //     await webhookHandler.initialize();
    // } catch (error) {
    //     console.error('Failed to initialize webhook handler:', error);
    // }

    // Initialize event listener
    try {
        const modulsDeployerAddress = config.contractAddresses[config.chainMode].modulsDeployer;
        eventUnwatch = await listenAndProcessOnchainEvents(modulsDeployerAddress);
    } catch (error) {
        console.error('Failed to initialize event listener:', error);
    }

    console.log(`${config.appName} is running on port ${app.get("port")}`);
});

process.on('SIGINT', async () => {
    console.log("SIGINT signal received, stopping services");
    if (eventUnwatch) {
        await stopEventListening(eventUnwatch);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log("SIGTERM signal received, stopping services");
    if (eventUnwatch) {
        await stopEventListening(eventUnwatch);
    }
    process.exit(0);
});