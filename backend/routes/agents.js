const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Agent = require("../core/models/agents");
const { verifySession } = require('../core/middlewares/session');
const { agentCreateSchema, agentResponseSchema } = require('../core/schemas');
const config = require('../config');
const { createEncryptedWalletAccount } = require('../core/utils');
const Secret = require('../core/models/secrets');


// Configure Cloudinary
cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'moduls-agents',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, and GIF are allowed.'), false);
        }
    },
});

router.get("/agents/mine", verifySession, async (req, res) => {
    try {
        const { _id: userId } = req.user;
        const agents = await Agent.find({ creator: userId }).populate('creator').lean()


        // Filter and compose the response using the schema
        const filteredAgents = agents.map(agent => {

            // Remove null fields from each agent object
            Object.keys(agent).forEach(key => {
                if (agent[key] === null) {
                    delete agent[key];
                }
            });

            const agentData = Object.assign({}, agent, {
                prebuySettings: {
                    slippage: agent.prebuySettings.slippage,
                    amountInWei: agent.prebuySettings.amountInWei ? agent.prebuySettings.amountInWei.toString() : undefined,
                },
            });

            // Validate and transform the data
            const { success, data, error } = agentResponseSchema.safeParse(agentData);
            if (!success) {
                console.error(`Data validation failed for agent ${agent.uniqueId}:`, error.message);
                return null;
            }
            return data;
        }).filter(Boolean);


        return res.status(200).json({
            agents: filteredAgents,
            count: filteredAgents.length
        });
    } catch (error) {
        console.error('Error fetching user agents:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.get("/agents/:uniqueId", async (req, res) => {
    try {
        const { uniqueId } = req.params;

        const agent = await Agent.findOne({ uniqueId })
            .populate('creator')
            .lean();


        if (!agent) {
            return res.status(404).json({
                message: 'Agent not found'
            });
        }

        // Remove null fields from agent object
        Object.keys(agent).forEach(key => {
            if (agent[key] === null) {
                delete agent[key];
            }
        });


        const agentData = Object.assign({}, agent, {
            prebuySettings: {
                slippage: agent.prebuySettings.slippage,
                amountInWei: agent.prebuySettings.amountInWei ? agent.prebuySettings.amountInWei.toString() : undefined,
            },
        });

        // Validate and transform the data
        const { success, data, error } = agentResponseSchema.safeParse(agentData);


        if (!success) {
            console.error(`Data validation failed for agent ${agent.uniqueId}:`, error.message);
            return res.status(500).json({
                message: `Data validation failed for agent ${agent.uniqueId}`,
                error: error.message
            });
        }

        return res.status(200).json({
            agent: data
        });
    } catch (error) {
        console.error('Error fetching agent:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.post("/agents", verifySession, upload.single('image'), async (req, res) => {
    try {
        const { _id: userId } = req.user;

        // Prepare the data for validation (convert string values to appropriate types)
        const requestData = {
            name: req.body.name,
            description: req.body.description,
            modulType: req.body.modulType,
            tokenSymbol: req.body.tokenSymbol,
            totalSupply: parseInt(req.body.totalSupply),
            totalTaxPercentage: parseInt(req.body.totalTaxPercentage),
            agentWalletShare: parseInt(req.body.agentWalletShare),
            devWalletShare: parseInt(req.body.devWalletShare),
            slippage: parseInt(req.body.slippage),
            amountInWei: req.body.amountInWei,
            websiteUrl: req.body.websiteUrl,
            twitterUrl: req.body.twitterUrl,
            telegramUrl: req.body.telegramUrl,
            tags: req.body.tags ? req.body.tags.split(',') : [],
            image: req.file ? req.file.path : req.body.image || '',
            launchDate: req.body.launchDate ? new Date(req.body.launchDate) : undefined
        };



        // Validate the request data
        const { success, data, error } = agentCreateSchema.safeParse(requestData);


        if (!success) {
            return res.status(400).json({
                error: error.flatten(),
                message: "Invalid request data"
            });
        }

        // Generate unique identifiers
        const uniqueId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

        // check if intentId is already in use, if so, generate a new one
        let intentId;
        while (true) {
            intentId = Math.floor(Math.random() * 1000000000000) + 1;
            const existingAgent = await Agent.findOne({ intentId });
            if (!existingAgent) {
                break;
            }
        }

        // --- Create an encrypted wallet for the agent ---
        const password = config.agentWalletSecret + uniqueId;
        const wallet = createEncryptedWalletAccount(password);
        // Save the encrypted private key as a Secret
        const secret = await Secret.create({
            ownerType: 'Agent',
            owner: null, // will be set after agent is created
            secretType: 'PRIVATE_KEY',
            secretValue: wallet.encryptedPrivateKey,
            description: 'Agent wallet private key (encrypted)',
            metadata: {},
            isActive: true
        });

        // Create the agent object matching the backend schema
        const agentData = {
            uniqueId,
            intentId,
            name: data.name,
            description: data.description,
            image: data.image,
            tags: data.tags,
            status: 'PENDING',
            launchDate: data.launchDate,
            isVerified: false,
            creator: userId,
            modulType: data.modulType,
            tokenSymbol: data.tokenSymbol,
            tokenDecimals: 18,
            totalSupply: data.totalSupply,
            taxSettings: {
                totalTaxPercentage: data.totalTaxPercentage,
                agentWalletShare: data.agentWalletShare,
                devWalletShare: data.devWalletShare,
            },
            prebuySettings: {
                slippage: data.slippage,
                amountInWei: data.amountInWei,
            },
            websiteUrl: data.websiteUrl,
            telegramUrl: data.telegramUrl,
            twitterUrl: data.twitterUrl,
            logoUrl: data.image,
            walletAddress: wallet.address,
            walletSecret: secret._id,
        };

        // Create the agent in the database
        const agent = await Agent.create(agentData);
        // Update the secret with the agent's id as owner
        secret.owner = agent._id;
        await secret.save();

        return res.status(201).json({
            agent: {
                intentId: agent.intentId,
                uniqueId: agent.uniqueId,
                name: agent.name,
                tokenSymbol: agent.tokenSymbol,
                description: agent.description,
                modulType: agent.modulType,
                logoUrl: agent.logoUrl,
                status: agent.status,
                createdAt: agent.createdAt,
                walletAddress: agent.walletAddress,
                totalSupply: agent.totalSupply,
                totalTaxPercentage: agent.taxSettings.totalTaxPercentage,
                agentWalletShare: agent.taxSettings.agentWalletShare,
                devWalletShare: agent.taxSettings.devWalletShare,
                preBuySettings: {
                    slippage: agent.prebuySettings.slippage,
                    amountInWei: agent.prebuySettings.amountInWei?.toString(),
                },
                launchDate: agent.launchDate,
            }
        });

    } catch (error) {
        console.error('Error creating agent:', error);

        // If there was an error and a file was uploaded, delete it from Cloudinary
        if (req.file) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (deleteError) {
                console.error('Error deleting uploaded file:', deleteError);
            }
        }

        return res.status(500).json({
            message: 'Failed to create agent',
            error: error.message
        });
    }
});

module.exports = router;