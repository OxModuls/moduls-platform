import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFetcher } from '../../lib/fetcher';
import config from '../config';
import { toast } from 'sonner';
import { useThreadStore } from '../store';

/**
 * Hook to fetch threads for a specific agent
 */
export const useAgentThreads = (agentId, options = {}) => {
    const {
        enabled = true,
        limit = 20,
        offset = 0,
        status = 'ACTIVE',
        refetchInterval = 10000, // Refetch every 10 seconds
        selectedThreadId = null // Add selectedThreadId to trigger refetch when selection changes
    } = options;

    return useQuery({
        queryKey: ['agent-threads', agentId, limit, offset, status, selectedThreadId],
        queryFn: async () => {
            if (!agentId) return null;

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
                status
            });

            return await createFetcher({
                url: `${config.endpoints.chatThreads}/${agentId}?${params}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled: enabled && !!agentId,
        refetchInterval,
        staleTime: 30000, // Consider data stale after 30 seconds
        refetchOnWindowFocus: true,
    });
};

/**
 * Hook to fetch recent threads across all agents
 */
export const useRecentThreads = (options = {}) => {
    const {
        enabled = true,
        limit = 10,
        offset = 0,
        refetchInterval = 60000 // Refetch every minute
    } = options;

    return useQuery({
        queryKey: ['recent-threads', limit, offset],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });

            return await createFetcher({
                url: `${config.endpoints.chatThreads}?${params}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled,
        refetchInterval,
        staleTime: 30000, // Consider data stale after 30 seconds
        refetchOnWindowFocus: true,
    });
};

/**
 * Hook to fetch messages for a specific thread
 */
export const useThreadMessages = (threadId, options = {}) => {
    const {
        enabled = true,
        limit = 50,
        offset = 0,
        before,
        refetchInterval = false, // Disable automatic refetching to prevent message order issues
        staleTime = 5000 // Consider data stale after 5 seconds for real-time chat
    } = options;

    return useQuery({
        queryKey: ['thread-messages', threadId, limit, offset, before],
        queryFn: async () => {
            if (!threadId) return null;

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });

            if (before) {
                params.append('before', before);
            }

            return await createFetcher({
                url: `${config.endpoints.chatMessages}/${threadId}/messages?${params}`,
                method: 'GET',
                credentials: 'include',
            })();
        },
        enabled: enabled && !!threadId,
        refetchInterval,
        staleTime,
        refetchOnWindowFocus: true,
    });
};

/**
 * Hook to create a new thread
 */
export const useCreateThread = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (threadData) => {
            return await createFetcher({
                url: config.endpoints.createThread,
                method: 'POST',
                body: threadData,
                credentials: 'include',
            })();
        },
        onSuccess: (variables) => {
            // Invalidate and refetch threads for the specific agent
            queryClient.invalidateQueries({
                queryKey: ['agent-threads', variables.agentId]
            });

            // Invalidate recent threads
            queryClient.invalidateQueries({
                queryKey: ['recent-threads']
            });

            // toast.success('New conversation started');
        },
        onError: (error) => {
            console.error('Error creating thread:', error);
            toast.error('Failed to start conversation');
        }
    });
};

/**
 * Hook to create a new message
 */
export const useCreateMessage = (options = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, onError } = options;

    return useMutation({
        mutationFn: async ({ threadId, messageData }) => {
            return await createFetcher({
                url: `${config.endpoints.createMessage}/${threadId}/messages`,
                method: 'POST',
                body: messageData,
                credentials: 'include',
            })();
        },
        onSuccess: (data, variables) => {
            // Invalidate and refetch messages for the specific thread
            queryClient.invalidateQueries({
                queryKey: ['thread-messages', variables.threadId]
            });

            // Invalidate threads to update lastMessageAt
            queryClient.invalidateQueries({
                queryKey: ['agent-threads']
            });

            queryClient.invalidateQueries({
                queryKey: ['recent-threads']
            });

            // Call custom onSuccess if provided
            if (onSuccess) {
                onSuccess(data, variables);
            }
        },
        onError: (error, variables) => {
            console.error('Error creating message:', error);
            toast.error('Failed to send message');

            // Call custom onError if provided
            if (onError) {
                onError(error, variables);
            }
        }
    });
};

/**
 * Hook to create a thread with the first message
 */
export const useCreateThreadWithMessage = (options = {}) => {
    const queryClient = useQueryClient();
    const { onSuccess, onError } = options;

    return useMutation({
        mutationFn: async ({ agentId, content, messageType = 'text', metadata }) => {
            return await createFetcher({
                url: config.endpoints.createThreadWithMessage,
                method: 'POST',
                body: { agentId, content, messageType, metadata },
                credentials: 'include',
            })();
        },
        onSuccess: (data, variables) => {
            // Invalidate thread and messages caches
            queryClient.invalidateQueries({ queryKey: ['agent-threads', variables.agentId] });
            queryClient.invalidateQueries({ queryKey: ['recent-threads'] });

            if (onSuccess) onSuccess(data, variables);
        },
        onError: (error, variables) => {
            console.error('Error creating thread with message:', error);
            toast.error('Failed to start conversation');
            if (onError) onError(error, variables);
        }
    });
};

/**
 * Hook to update a thread
 */
export const useUpdateThread = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ threadId, updateData }) => {
            return await createFetcher({
                url: `${config.endpoints.updateThread}/${threadId}`,
                method: 'PUT',
                body: updateData,
                credentials: 'include',
            })();
        },
        onSuccess: () => {
            // Invalidate and refetch threads
            queryClient.invalidateQueries({
                queryKey: ['agent-threads']
            });

            queryClient.invalidateQueries({
                queryKey: ['recent-threads']
            });

            toast.success('Conversation updated');
        },
        onError: (error) => {
            console.error('Error updating thread:', error);
            toast.error('Failed to update conversation');
        }
    });
};

/**
 * Hook to delete a thread
 */
export const useDeleteThread = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (threadId) => {
            return await createFetcher({
                url: `${config.endpoints.deleteThread}/${threadId}`,
                method: 'DELETE',
                credentials: 'include',
            })();
        },
        onSuccess: (data, threadId) => {
            // Invalidate and refetch threads
            queryClient.invalidateQueries({
                queryKey: ['agent-threads']
            });

            queryClient.invalidateQueries({
                queryKey: ['recent-threads']
            });

            // Remove messages for the deleted thread
            queryClient.removeQueries({
                queryKey: ['thread-messages', threadId]
            });

            // Only clear the selected thread if it was the deleted one
            const { selectedThreadId, clearSelectedThread } = useThreadStore.getState();
            if (selectedThreadId === threadId) {
                clearSelectedThread();
            }

            toast.success('Conversation deleted');
        },
        onError: (error) => {
            console.error('Error deleting thread:', error);
            toast.error('Failed to delete conversation');
        }
    });
};

/**
 * Hook to regenerate thread title
 */
export const useRegenerateThreadTitle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (threadId) => {
            return await createFetcher({
                url: `${config.endpoints.regenerateThreadTitle}/${threadId}`,
                method: 'POST',
                credentials: 'include',
            })();
        },
        onSuccess: () => {
            // Invalidate and refetch threads to show updated title
            queryClient.invalidateQueries({
                queryKey: ['agent-threads']
            });

            queryClient.invalidateQueries({
                queryKey: ['recent-threads']
            });

            toast.success('Thread title regenerated successfully');
        },
        onError: (error) => {
            console.error('Error regenerating title:', error);
            toast.error('Failed to regenerate thread title');
        }
    });
};

/**
 * Hook to update a message
 */
export const useUpdateMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ messageId, updateData }) => {
            return await createFetcher({
                url: `${config.endpoints.updateMessage}/${messageId}`,
                method: 'PUT',
                body: updateData,
                credentials: 'include',
            })();
        },
        onSuccess: () => {
            // Invalidate and refetch messages for the specific thread
            queryClient.invalidateQueries({
                queryKey: ['thread-messages']
            });
        },
        onError: (error) => {
            console.error('Error updating message:', error);
            toast.error('Failed to update message');
        }
    });
};
