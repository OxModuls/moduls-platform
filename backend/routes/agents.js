const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Agent = require("../core/models/agents");
const { verifyToken } = require('../core/middlewares/jwt');
const { agentCreateSchema } = require('../core/schemas');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
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

router.get("/agents/mine", verifyToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const agents = await Agent.find({ userId }).exec();
        return res.status(200).json({ agents });
    } catch (error) {
        console.error('Error fetching user agents:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.post("/agents/create", verifyToken, upload.single('image'), async (req, res) => {
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
        };

        // Validate the request data
        const { success, data, error } = agentCreateSchema.safeParse(requestData);

        if (!success) {
            return res.status(400).json({
                error: error.errors,
                message: "Invalid request data"
            });
        }

        // Generate unique identifiers
        const uniqueId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const intentId = Math.floor(Math.random() * 1000000000000) + 1;

        // Create the agent object matching the backend schema
        const agentData = {
            uniqueId,
            intentId,
            name: data.name,
            description: data.description,
            image: data.image,
            tags: data.tags,
            telegramUrl: data.telegramUrl || '',
            status: 'PENDING',
            launchDate: new Date(),
            isVerified: false,
            creator: userId,

            // Additional required fields from the form
            walletAddress: '', // Will be set after wallet generation
            walletSecret: null, // Will be set after secret creation
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
            websiteUrl: data.websiteUrl || '',
            twitterUrl: data.twitterUrl || '',
            logoUrl: data.image,
        };

        // Create the agent in the database
        const agent = await Agent.create(agentData);

        // Return success response
        return res.status(201).json({
            success: true,
            message: 'Agent created successfully',
            agent: {
                id: agent._id,
                uniqueId: agent.uniqueId,
                name: agent.name,
                description: agent.description,
                modulType: agent.modulType,
                tokenSymbol: agent.tokenSymbol,
                image: agent.logoUrl,
                status: agent.status,
                createdAt: agent.createdAt,
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
            success: false,
            message: 'Failed to create agent',
            error: error.message
        });
    }
});

module.exports = router;