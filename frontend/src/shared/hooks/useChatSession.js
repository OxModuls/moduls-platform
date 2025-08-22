import { useEffect, useState, useCallback } from "react";
import { useAgentThreads, useThreadMessages, useCreateMessage, useCreateThreadWithMessage } from "./useChat";

/**
 * useChatSession
 * Centralizes threads, messages, and sending logic for chat UIs.
 */
export function useChatSession(agentUniqueId, initialThreadId = null) {
    const [selectedThreadId, setSelectedThreadId] = useState(initialThreadId);
    const [localMessages, setLocalMessages] = useState([]);

    // Threads
    const {
        data: threadsData,
        isPending: threadsLoading,
    } = useAgentThreads(agentUniqueId, { enabled: !!agentUniqueId, refetchInterval: false });

    // Pick default thread if none selected yet
    useEffect(() => {
        const apiThreads = threadsData?.data?.threads || [];
        if (!selectedThreadId && apiThreads.length > 0) {
            setSelectedThreadId(apiThreads[0].uniqueId);
        }
    }, [selectedThreadId, threadsData?.data?.threads]);

    // Messages
    const {
        data: messagesData,
        isPending: messagesLoading,
        refetch: refetchMessages,
    } = useThreadMessages(selectedThreadId, { enabled: !!selectedThreadId, refetchInterval: false, staleTime: Infinity });

    useEffect(() => {
        setLocalMessages(messagesData?.data?.messages || []);
    }, [messagesData?.data?.messages]);

    // Send message mutations
    const sendMutation = useCreateMessage();
    const startConversationMutation = useCreateThreadWithMessage();

    const sendMessage = useCallback((text) => {
        if (!text?.trim()) return;

        // Add optimistic user message to UI
        const userMessage = { _id: `local_${Date.now()}`, role: 'user', content: text };
        setLocalMessages(prev => [...prev, userMessage]);

        // Check if we have a valid thread ID 
        const hasValidThread = Boolean(selectedThreadId);

        if (hasValidThread) {
            console.log('useChatSession: Sending to existing thread:', selectedThreadId);
            sendMutation.mutate({
                threadId: selectedThreadId,
                messageData: { content: text, messageType: 'text' }
            }, {
                onSuccess: (data) => {
                    // Replace optimistic message with real user message + add assistant response
                    setLocalMessages(prev => {
                        const withoutOptimistic = prev.filter(msg => !msg._id.startsWith('local_'));
                        return [...withoutOptimistic, data.data.userMessage, data.data.assistantMessage];
                    });
                },
                onError: () => {
                    // Remove the optimistic message on error
                    setLocalMessages(prev => prev.filter(msg => !msg._id.startsWith('local_')));
                }
            });
        } else {
            console.log('useChatSession: Creating new thread for agent:', agentUniqueId, 'current selectedThreadId:', selectedThreadId);
            startConversationMutation.mutate({
                agentId: agentUniqueId,
                content: text,
                messageType: 'text'
            }, {
                onSuccess: (data) => {
                    const newThreadId = data?.data?.thread?.uniqueId;
                    if (newThreadId) {
                        setSelectedThreadId(newThreadId);
                    }
                    // Replace optimistic message with real user message + add assistant response
                    setLocalMessages(prev => {
                        const withoutOptimistic = prev.filter(msg => !msg._id.startsWith('local_'));
                        return [...withoutOptimistic, data.data.userMessage, data.data.assistantMessage];
                    });
                },
                onError: () => {
                    // Remove the optimistic message on error
                    setLocalMessages(prev => prev.filter(msg => !msg._id.startsWith('local_')));
                }
            });
        }
    }, [selectedThreadId, sendMutation, startConversationMutation, agentUniqueId]);

    return {
        // Threads
        threads: threadsData?.data?.threads || [],
        threadsLoading,
        selectedThreadId,
        setSelectedThreadId,

        // Messages
        messages: localMessages,
        messagesLoading,
        refetchMessages,

        // Sending
        isSending: sendMutation.isPending || startConversationMutation.isPending,
        sendMessage,
    };
}



