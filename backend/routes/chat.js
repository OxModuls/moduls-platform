const express = require('express');
const Thread = require('../core/models/threads');
const Message = require('../core/models/messages');
const Agent = require('../core/models/agents');
const { verifySession } = require('../core/middlewares/session');
const {
    threadCreateSchema,
    threadUpdateSchema,
    messageCreateSchema,
    messageUpdateSchema
} = require('../core/schemas');
const { processMessage } = require('../core/services');
const crypto = require('crypto');

const router = express.Router();

// Helper function to generate unique IDs
const generateUniqueId = (prefix) => {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
};

/**
 * Get all threads for a user with a specific agent
 */
router.get('/threads/:agentId', verifySession, async (req, res) => {
    try {
        const { agentId } = req.params;
        const { limit = 20, offset = 0, status = 'ACTIVE' } = req.query;
        const userId = req.user._id;

        // Verify agent exists
        const agent = await Agent.findOne({ uniqueId: agentId });
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Get threads with pagination
        const threads = await Thread.find({
            $or: [
                { agentId: agent._id },
                { agentUniqueId: agentId }
            ],
            userId,
            status
        })
            .sort({ lastMessageAt: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .lean();

        const total = await Thread.countDocuments({
            $or: [
                { agentId: agent._id },
                { agentUniqueId: agentId }
            ],
            userId,
            status
        });

        return res.status(200).json({
            success: true,
            data: {
                threads,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + threads.length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching threads:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Get recent threads across all agents for a user
 */
router.get('/threads', verifySession, async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const userId = req.user._id;

        // Get recent threads across all agents
        const threads = await Thread.find({
            userId,
            status: 'ACTIVE'
        })
            .populate('agentId', 'uniqueId name logoUrl modulType')
            .sort({ lastMessageAt: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .lean();

        const total = await Thread.countDocuments({
            userId,
            status: 'ACTIVE'
        });

        return res.status(200).json({
            success: true,
            data: {
                threads,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + threads.length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching recent threads:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Create a new thread
 */
router.post('/threads', verifySession, async (req, res) => {
    try {
        const validation = threadCreateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.error.errors
            });
        }

        const { agentId, title, tags } = validation.data;
        const userId = req.user._id;

        // Verify agent exists
        const agent = await Agent.findOne({ uniqueId: agentId });
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Create new thread
        const thread = new Thread({
            uniqueId: generateUniqueId('thread'),
            agentId: agent._id,
            agentUniqueId: agent.uniqueId, // Store agent's uniqueId for easier lookup
            userId,
            userWalletAddress: req.user.walletAddress,
            title: title || 'New Conversation',
            tags: tags || []
        });

        await thread.save();

        return res.status(201).json({
            success: true,
            data: thread
        });

    } catch (error) {
        console.error('Error creating thread:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Update a thread
 */
router.put('/threads/:threadId', verifySession, async (req, res) => {
    try {
        const { threadId } = req.params;
        const validation = threadUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.error.flatten().fieldErrors
            });
        }

        const userId = req.user._id;
        const updateData = validation.data;

        // Find and update thread
        const thread = await Thread.findOneAndUpdate(
            { uniqueId: threadId, userId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!thread) {
            return res.status(404).json({
                success: false,
                message: 'Thread not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: thread
        });

    } catch (error) {
        console.error('Error updating thread:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Get messages for a specific thread
 */
router.get('/threads/:threadId/messages', verifySession, async (req, res) => {
    try {
        const { threadId } = req.params;
        const { limit = 50, offset = 0, before } = req.query;
        const userId = req.user._id;

        // Verify thread exists and user has access
        const thread = await Thread.findOne({ uniqueId: threadId, userId });
        if (!thread) {
            return res.status(404).json({
                success: false,
                message: 'Thread not found'
            });
        }

        // Build query for messages
        let query = { threadId: thread._id };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        // Get messages with pagination
        const messages = await Message.find(query)
            .sort({ createdAt: 1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .lean();

        const total = await Message.countDocuments({ threadId: thread._id });

        return res.status(200).json({
            success: true,
            data: {
                messages,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: total > parseInt(offset) + messages.length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Create a new message
 */
router.post('/threads/:threadId/messages', verifySession, async (req, res) => {
    try {
        const { threadId } = req.params;
        const userId = req.user._id;

        // Create the full message data including threadId from params
        const messageData = {
            threadId,
            ...req.body
        };

        const validation = messageCreateSchema.safeParse(messageData);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.error.flatten().fieldErrors
            });
        }

        const { content, parentMessageId, messageType, metadata } = validation.data;

        // Verify thread exists and user has access
        const thread = await Thread.findOne({ uniqueId: threadId, userId });
        if (!thread) {
            return res.status(404).json({
                success: false,
                message: 'Thread not found'
            });
        }

        // Create new message
        const message = new Message({
            uniqueId: generateUniqueId('msg'),
            threadId: thread._id,
            agentId: thread.agentId,
            userId,
            content,
            parentMessageId,
            messageType,
            role: 'user',
            metadata: metadata || {},
            status: 'pending' // Set initial status as pending
        });

        await message.save();

        // Update thread statistics
        await Thread.findByIdAndUpdate(thread._id, {
            $inc: { messageCount: 1 },
            lastMessageAt: new Date()
        });

        // Process the message using modul services (async - don't wait for response)
        processMessage(threadId, message.uniqueId, { content, messageType, metadata })
            .then(result => {
                console.log('Message processed successfully:', result);
            })
            .catch(error => {
                console.error('Message processing failed:', error);
                // Update message status to failed
                Message.findOneAndUpdate({ uniqueId: message.uniqueId }, {
                    status: 'failed',
                    error: error.message,
                    updatedAt: new Date()
                }).catch(updateError => {
                    console.error('Failed to update message status:', updateError);
                });
            });

        return res.status(201).json({
            success: true,
            data: message,
            message: 'Message created and queued for processing'
        });

    } catch (error) {
        console.error('Error creating message:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Update a message
 */
router.put('/messages/:messageId', verifySession, async (req, res) => {
    try {
        const { messageId } = req.params;
        const validation = messageUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.error.flatten().fieldErrors
            });
        }

        const userId = req.user._id;
        const updateData = validation.data;

        // Find and update message
        const message = await Message.findOneAndUpdate(
            { uniqueId: messageId, userId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: message
        });

    } catch (error) {
        console.error('Error updating message:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Delete a thread (soft delete)
 */
router.delete('/threads/:threadId', verifySession, async (req, res) => {
    try {
        const { threadId } = req.params;
        const userId = req.user._id;

        // Soft delete thread
        const thread = await Thread.findOneAndUpdate(
            { uniqueId: threadId, userId },
            { status: 'DELETED' },
            { new: true }
        );

        if (!thread) {
            return res.status(404).json({
                success: false,
                message: 'Thread not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Thread deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting thread:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
