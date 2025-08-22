const express = require('express');
const Thread = require('../core/models/threads');
const Message = require('../core/models/messages');
const Agent = require('../core/models/agents');
const { verifySession } = require('../core/middlewares/session');
const {
    threadCreateSchema,
    threadUpdateSchema,
    messageCreateSchema,
    messageUpdateSchema,
    threadWithMessageSchema
} = require('../core/schemas');
const { processMessage } = require('../core/services');
const LLMInterface = require('../core/services/llm-interface');
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
 * Regenerate title for a thread based on its messages
 */
router.post('/threads/:threadId/regenerate-title', verifySession, async (req, res) => {
    try {
        const { threadId } = req.params;
        const userId = req.user._id;

        // Verify thread exists and user has access
        const thread = await Thread.findOne({ uniqueId: threadId, userId }).populate('agentId');
        if (!thread) {
            return res.status(404).json({
                success: false,
                message: 'Thread not found'
            });
        }

        // Get the first few messages to generate title from
        const messages = await Message.find({ threadId: thread._id })
            .sort({ createdAt: 1 })
            .limit(4) // Get first 4 messages (2 exchanges)
            .lean();

        if (messages.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Thread needs at least one user message and one assistant response to generate title'
            });
        }

        // Find first user message and first assistant response
        const firstUserMessage = messages.find(m => m.role === 'user');
        const firstAssistantMessage = messages.find(m => m.role === 'assistant');

        if (!firstUserMessage || !firstAssistantMessage) {
            return res.status(400).json({
                success: false,
                message: 'Thread needs both user and assistant messages to generate title'
            });
        }

        try {
            const llm = new LLMInterface();

            const context = {
                agentName: thread.agentId?.name || 'AI Agent',
                modulType: thread.agentId?.modulType || 'AI Agent'
            };

            const generatedTitle = await llm.generateThreadTitle(
                firstUserMessage.content,
                firstAssistantMessage.content,
                context
            );

            // Update the thread with the generated title
            const updatedThread = await Thread.findByIdAndUpdate(
                thread._id,
                { title: generatedTitle, updatedAt: new Date() },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                data: {
                    thread: updatedThread,
                    generatedTitle
                },
                message: 'Thread title regenerated successfully'
            });

        } catch (titleError) {
            console.error('Title generation failed:', titleError);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate title',
                error: titleError.message
            });
        }

    } catch (error) {
        console.error('Error regenerating thread title:', error);
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

        // Process the message using modul services (synchronously to get immediate response)
        try {
            const result = await processMessage(threadId, message.uniqueId, { content, messageType, metadata });

            // Generate title for existing threads if this is the first assistant response
            // and the thread still has a default title
            if (thread.title.toLowerCase() === 'new conversation' || thread.title.toLowerCase() === 'new conversation') {
                try {
                    const llm = new LLMInterface();

                    // Get agent info for context
                    const agent = await Agent.findById(thread.agentId);
                    const context = {
                        agentName: agent?.name || 'AI Agent',
                        modulType: agent?.modulType || 'AI Agent'
                    };

                    const generatedTitle = await llm.generateThreadTitle(content, result.assistantMessage.content, context);

                    // Update the thread with the generated title
                    await Thread.findByIdAndUpdate(thread._id, {
                        title: generatedTitle,
                        updatedAt: new Date()
                    });

                } catch (titleError) {
                    console.log('Failed to generate title for existing thread:', titleError.message);
                    // Keep the default title if generation fails
                }
            }

            // Sanitize message objects to avoid BigInt serialization issues
            const sanitizeForJSON = (obj) => {
                return JSON.parse(JSON.stringify(obj, (key, value) => {
                    if (typeof value === 'bigint') {
                        return value.toString();
                    }
                    return value;
                }));
            };

            return res.status(201).json({
                success: true,
                data: {
                    userMessage: sanitizeForJSON(message),
                    assistantMessage: sanitizeForJSON(result.assistantMessage)
                },
                message: 'Message processed successfully'
            });
        } catch (error) {
            console.error('Message processing failed:', error);
            // Update message status to failed
            await Message.findOneAndUpdate({ uniqueId: message.uniqueId }, {
                status: 'failed',
                error: error.message,
                updatedAt: new Date()
            });

            return res.status(500).json({
                success: false,
                message: 'Message processing failed',
                error: error.message
            });
        }

    } catch (error) {
        console.error('Error creating message:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Create a thread and send first message in one operation
 */
router.post('/threads/with-message', verifySession, async (req, res) => {
    try {
        const validation = threadWithMessageSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.error.flatten().fieldErrors
            });
        }

        const { agentId, content, messageType, metadata } = validation.data;
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
            agentUniqueId: agent.uniqueId,
            userId,
            userWalletAddress: req.user.walletAddress,
            title: content.length > 50 ? content.substring(0, 50) + '...' : content,
            tags: []
        });

        await thread.save();

        // Create the first message
        const message = new Message({
            uniqueId: generateUniqueId('msg'),
            threadId: thread._id,
            agentId: thread.agentId,
            userId,
            content,
            messageType,
            role: 'user',
            metadata: metadata || {},
            status: 'pending'
        });

        await message.save();

        // Update thread statistics
        await Thread.findByIdAndUpdate(thread._id, {
            $inc: { messageCount: 1 },
            lastMessageAt: new Date()
        });

        // Process the message using modul services (synchronously to get immediate response)
        try {
            const result = await processMessage(thread.uniqueId, message.uniqueId, { content, messageType, metadata });

            // Generate a descriptive title based on the conversation
            try {
                const llm = new LLMInterface();

                const context = {
                    agentName: agent.name,
                    modulType: agent.modulType
                };

                const generatedTitle = await llm.generateThreadTitle(content, result.assistantMessage.content, context);

                // Update the thread with the generated title
                await Thread.findByIdAndUpdate(thread._id, {
                    title: generatedTitle,
                    updatedAt: new Date()
                });

                // Update the thread object for response
                thread.title = generatedTitle;

            } catch (titleError) {
                console.warn('Failed to generate title, keeping default:', titleError.message);
                // Keep the default title if generation fails
            }

            // Sanitize objects to avoid BigInt serialization issues
            const sanitizeForJSON = (obj) => {
                return JSON.parse(JSON.stringify(obj, (key, value) => {
                    if (typeof value === 'bigint') {
                        return value.toString();
                    }
                    return value;
                }));
            };

            return res.status(201).json({
                success: true,
                data: {
                    thread: sanitizeForJSON(thread),
                    userMessage: sanitizeForJSON(message),
                    assistantMessage: sanitizeForJSON(result.assistantMessage)
                },
                message: 'Thread created and message processed successfully'
            });
        } catch (error) {
            console.error('Message processing failed:', error);
            // Update message status to failed
            await Message.findOneAndUpdate({ uniqueId: message.uniqueId }, {
                status: 'failed',
                error: error.message,
                updatedAt: new Date()
            });

            return res.status(500).json({
                success: false,
                message: 'Thread created but message processing failed',
                error: error.message
            });
        }

    } catch (error) {
        console.error('Error creating thread with message:', error);
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
 * Delete a thread (permanent deletion)
 */
router.delete('/threads/:threadId', verifySession, async (req, res) => {
    try {
        const { threadId } = req.params;
        const userId = req.user._id;

        // Find thread to verify ownership
        const thread = await Thread.findOne({ uniqueId: threadId, userId });
        if (!thread) {
            return res.status(404).json({
                success: false,
                message: 'Thread not found'
            });
        }

        // Permanently delete all messages in the thread
        await Message.deleteMany({ threadId: thread._id });

        // Permanently delete the thread
        await Thread.findByIdAndDelete(thread._id);

        return res.status(200).json({
            success: true,
            message: 'Thread and all messages permanently deleted',
            deletedThreadId: threadId
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
