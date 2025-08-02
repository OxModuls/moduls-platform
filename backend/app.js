const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const config = require('./config');
const connectDB = require('./core/db');
const usersRouter = require('./routes/users');
const agentsRouter = require('./routes/agents');
const fs = require('fs');
const path = require('path');
const { openApiDoc } = require('./core/openapi');
const swaggerUi = require('swagger-ui-express');
const { IndexerService, routes: indexerRoutes } = require('./core/indexer');

const app = express();

// CONFIG

app.set("port", config.port);



// MIDDLEWARES

if (!config.isProd) {
    app.use(morgan('dev'));
} else {

    const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
    app.use(morgan('combined', { stream: accessLogStream }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],

}));

// INDEXER SERVICE

let indexerService;

// Contract watching is now handled by the indexer service

// ROUTES

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));
app.use('/api', usersRouter);
app.use('/api', agentsRouter);
app.use('/api/indexer', indexerRoutes);

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

    // Initialize and start indexer service
    try {
        indexerService = IndexerService.getInstance();
        await indexerService.start();
        console.log('Indexer service started successfully');
    } catch (error) {
        console.error('Failed to start indexer service:', error);
    }

    console.log(`${config.appName} is running on port ${app.get("port")}`);
});


process.on('SIGINT', async () => {
    if (indexerService) {
        await indexerService.stop();
        console.log("Indexer service stopped");
    }
    console.log("SIGINT signal received, stopping indexer service");
    process.exit(0);

});

process.on('SIGTERM', async () => {
    if (indexerService) {
        await indexerService.stop();
        console.log("Indexer service stopped");
    }
    console.log("SIGTERM signal received, stopping indexer service");
    process.exit(0);
});