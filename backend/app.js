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
const Agent = require('./core/models/agents');
const { registerContractWatcher, getModulsDeployerAddress } = require('./core/blockchainclient');

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

// EVENTS 

let unwatch;

async function startContractWatcher() {

    const modulsDeployerAddress = getModulsDeployerAddress();

    console.log("Starting contract watcher for", modulsDeployerAddress);
    unwatch = await registerContractWatcher(modulsDeployerAddress, async (logs) => {

        console.log(`Received ${logs.length} logs`);
        for (const log of logs) {
            if (log.eventName === "ModulsTokenCreated") {
                const { tokenAddress, intentId } = log.args;


                const correspondingAgent = await Agent.findOne({
                    intentId: Number(intentId)
                });

                if (correspondingAgent && correspondingAgent.status === "PENDING") {
                    correspondingAgent.status = "ACTIVE";
                    correspondingAgent.tokenAddress = tokenAddress;
                    await correspondingAgent.save();
                    console.log("Agent updated", correspondingAgent.uniqueId);
                }
                else {
                    console.log("Agent not found or already active", intentId);
                }


            } else {
                console.log("Unknown event", log.eventName);
            }
        }
    }, (error) => {
        console.error(error);
    }, () => {
        console.log("Disconnected from contract event");
    }, () => {
        console.log("Connected to contract event");
    });

}

function stopContractWatcher() {
    if (unwatch) {
        unwatch();
    }
    unwatch = null;
}

// ROUTES

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));
app.use('/api', usersRouter);
app.use('/api', agentsRouter);

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

app.listen(app.get("port"), () => {
    connectDB();
    startContractWatcher().catch(console.error);
    console.log(`${config.appName} is running on port ${app.get("port")}`);
});


process.on('SIGINT', () => {
    stopContractWatcher();
    console.log("SIGINT signal received, stopping event watcher");
    process.exit(0);

});

process.on('SIGTERM', () => {
    stopContractWatcher();
    console.log("SIGTERM signal received, stopping event watcher");
    process.exit(0);
});