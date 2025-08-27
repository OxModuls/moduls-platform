require('dotenv').config({ path: '.env.local' });

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Core imports
const connectDB = require('./core/db');
const config = require('./config');
const { openApiDoc } = require('./core/openapi');
const swaggerUi = require('swagger-ui-express');

// Route imports
const usersRouter = require('./routes/users');
const agentsRouter = require('./routes/agents');
const tradingRouter = require('./routes/trading');
const holdersRouter = require('./routes/holders');
const chatRouter = require('./routes/chat');
const webhookRoutes = require('./core/webhooks/routes');

// Event system imports
const { listenAndProcessOnchainEvents } = require('./core/moduls-deployer-events');
const { listenAndProcessTradingEvents } = require('./core/moduls-sales-events');
const { listenAndProcessTokenEvents } = require('./core/agent-token-events');
const ModulsMCPServer = require('./core/services/mcp/mcp-server');

// Initialize Express app and shared resources
const app = express();
let mcpServerInstance = null; // Store MCP server instance

// ============================================================================
// CONFIGURATION
// ============================================================================
app.set('port', config.port);

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================
function setupMiddleware() {
    // Logging - Show response code and method/url
    app.use(morgan('dev', {
        stream: {
            write: (message) => {
                process.stdout.write(message);
            }
        }
    }));

    // Body parsing
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));

    // Cookie parsing
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

    // CORS
    app.use(cors({
        origin: config.allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));
}

// ============================================================================
// ROUTE SETUP
// ============================================================================
function setupRoutes() {
    // API Documentation
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));

    // Core API Routes
    app.use('/api', usersRouter);
    app.use('/api', agentsRouter);
    app.use('/api/trading', tradingRouter);
    app.use('/api', holdersRouter);
    app.use('/api/chat', chatRouter);
    app.use('/api/webhooks', webhookRoutes);

    // Health check
    app.get('/', (req, res) => {
        res.json({
            status: 'OK',
            service: config.appName,
            timestamp: new Date().toISOString()
        });
    });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================
function setupErrorHandling() {
    // Global error handler
    app.use((err, req, res, next) => {
        console.error('❌ Unhandled error:', {
            message: err.message,
            stack: err.stack,
            status: err.status || 500,
            timestamp: new Date().toISOString(),
            url: req.url,
            method: req.method
        });

        res.status(err.status || 500).json({
            error: 'Internal Server Error',
            message: config.isDev ? err.message : 'Something went wrong'
        });
    });

    // 404 handler
    app.use((req, res) => {
        console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.originalUrl} not found`
        });
    });
}

// ============================================================================
// MCP SERVER INITIALIZATION
// ============================================================================
async function initializeMCPServer() {
    try {
        // Only initialize if not already running
        if (!mcpServerInstance || !mcpServerInstance.server.isConnected()) {
            console.log('🚀 Initializing MCP server...');
            mcpServerInstance = new ModulsMCPServer();
            await mcpServerInstance.start();
            console.log('✅ MCP server initialized successfully');
        } else {
            console.log('✅ MCP server already running');
        }
        return mcpServerInstance;
    } catch (error) {
        console.log('❌ Failed to initialize MCP server:', error);
        mcpServerInstance = null;
        return null;
    }
}

// ============================================================================
// EVENT SYSTEM INITIALIZATION
// ============================================================================
async function initializeEventSystem() {
    try {
        console.log('🚀 Initializing event system...');

        const { modulsDeployer, modulsSalesManager } = config.contractAddresses[config.chainMode];

        // Initialize blockchain event listeners
        const [eventUnwatch, tradingEventUnwatch, tokenEventUnwatch] = await Promise.all([
            listenAndProcessOnchainEvents(modulsDeployer),
            listenAndProcessTradingEvents(modulsSalesManager),
            listenAndProcessTokenEvents()
        ]);

        console.log('✅ Event system initialized successfully');

        // Return unwatch functions for cleanup
        return { eventUnwatch, tradingEventUnwatch, tokenEventUnwatch };

    } catch (error) {
        console.error('❌ Failed to initialize event system:', error);
        // Return empty unwatch functions if initialization fails
        return { eventUnwatch: null, tradingEventUnwatch: null, tokenEventUnwatch: null };
    }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
function setupGracefulShutdown(server, eventUnwatchers, mcpServer) {
    const shutdown = async (signal) => {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

        try {
            // Close server
            server.close(() => {
                console.log('✅ HTTP server closed');
            });

            // Stop MCP server
            try {
                if (mcpServerInstance) {
                    await mcpServerInstance.stop();
                    mcpServerInstance = null;
                    console.log('✅ MCP server stopped');
                }
            } catch (mcpError) {
                console.warn('⚠️ MCP server stop failed:', mcpError.message);
            }

            // Unwatch all blockchain events
            try {
                if (eventUnwatchers.eventUnwatch) {
                    eventUnwatchers.eventUnwatch();
                    console.log('✅ Deployer events unwatched');
                }
                if (eventUnwatchers.tradingEventUnwatch) {
                    eventUnwatchers.tradingEventUnwatch();
                    console.log('✅ Trading events unwatched');
                }
                if (eventUnwatchers.tokenEventUnwatch) {
                    eventUnwatchers.tokenEventUnwatch();
                    console.log('✅ Token events unwatched');
                }
            } catch (eventError) {
                console.warn('⚠️ Event unwatching failed:', eventError.message);
            }

            // Close database connection
            try {
                await mongoose.connection.close();
                console.log('✅ Database connection closed');
            } catch (dbError) {
                console.warn('⚠️ Database connection close failed:', dbError.message);
            }

            process.exit(0);

        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

// ============================================================================
// APPLICATION STARTUP
// ============================================================================
async function startApplication() {
    try {
        console.log('🚀 Starting Moduls Platform...');

        // Setup middleware and routes
        setupMiddleware();
        setupRoutes();
        setupErrorHandling();

        // Connect to database
        await connectDB();
        console.log('✅ Connected to MongoDB');


        // Initialize MCP server (non-blocking)
        let mcpServer = null;
        try {
            mcpServer = await Promise.race([
                initializeMCPServer(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('MCP server timeout')), 10000)
                )
            ]);
        } catch (mcpError) {
            console.warn('⚠️ MCP server initialization failed:', mcpError.message);
        }

        // Initialize event system (non-blocking)
        let eventUnwatchers = { eventUnwatch: null, tradingEventUnwatch: null, tokenEventUnwatch: null };
        try {
            eventUnwatchers = await Promise.race([
                initializeEventSystem(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Event system timeout')), 15000)
                )
            ]);
        } catch (eventError) {
            console.warn('⚠️ Event system initialization failed:', eventError.message);
        }


        // Start server
        const server = app.listen(app.get('port'), () => {
            console.log(`✅ ${config.appName} is running on port ${app.get('port')}`);
        });

        // Setup graceful shutdown with server reference
        setupGracefulShutdown(server, eventUnwatchers, mcpServer);

        console.log('🎉 Application startup completed successfully!');

    } catch (error) {
        console.error('❌ Failed to start application:', error);
        process.exit(1);
    }
}

// Start the application
startApplication();