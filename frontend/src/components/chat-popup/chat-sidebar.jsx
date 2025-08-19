import {
  useRecentThreads,
  useCreateThread,
  useDeleteThread,
} from "../../shared/hooks/useChat";
import { useAuth } from "../../shared/hooks/useAuth";
import { Button } from "../ui/button";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  useSidebar,
} from "../ui/sidebar";
import { useIsMobile } from "../../hooks/use-mobile";
import { cn } from "@/lib/utils";

const ChatSidebar = ({
  agent,
  selectedThreadId,
  onThreadSelect,
  className,
}) => {
  const { isAuthenticated } = useAuth();
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isDeletingThread, setIsDeletingThread] = useState(null);

  // Fetch recent threads
  const { data: threadsData, isLoading: threadsLoading } = useRecentThreads({
    enabled: isAuthenticated,
    limit: 20,
  });

  // Create and delete thread mutations
  const createThreadMutation = useCreateThread();
  const deleteThreadMutation = useDeleteThread();

  const threads = threadsData?.data?.threads || [];

  const handleCreateThread = async () => {
    if (!agent || !isAuthenticated) {
      toast.error("Please connect your wallet to start a conversation");
      return;
    }

    setIsCreatingThread(true);

    try {
      const result = await createThreadMutation.mutateAsync({
        agentId: agent.uniqueId,
        title: `New conversation`,
        tags: [agent.modulType],
      });

      // Auto-select the newly created thread
      if (result?.data?.uniqueId) {
        onThreadSelect(result.data.uniqueId);
      }
    } catch (error) {
      console.error("Failed to create thread:", error);
    } finally {
      setIsCreatingThread(false);
    }
  };

  const handleDeleteThread = async (threadId, e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please connect your wallet to delete conversations");
      return;
    }

    setIsDeletingThread(threadId);

    try {
      await deleteThreadMutation.mutateAsync(threadId);

      // If the deleted thread was selected, clear selection
      if (selectedThreadId === threadId) {
        onThreadSelect(null);
      }

      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Failed to delete thread:", error);
      toast.error("Failed to delete conversation");
    } finally {
      setIsDeletingThread(null);
    }
  };

  const handleThreadClick = (threadId) => {
    onThreadSelect(threadId);
    toggleSidebar();
  };

  const formatLastMessageTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Sidebar
      variant={isMobile ? "sidebar" : "inset"}
      className={cn(`${isMobile ? "" : "h-auto w-3xs"}`, className)}
    >
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button
            size="sm"
            onClick={handleCreateThread}
            disabled={isCreatingThread || !isAuthenticated}
            className="size-8 p-0"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="">
        <SidebarGroup className="">
          {/* Threads List */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {threadsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  Loading conversations...
                </div>
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  No conversations yet
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Start chatting with {agent?.name || "this agent"}
                </div>
              </div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.uniqueId}
                  className={`group flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all hover:bg-accent/50 ${
                    selectedThreadId === thread.uniqueId
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/30"
                  }`}
                  onClick={() => handleThreadClick(thread.uniqueId)}
                >
                  {/* Thread Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className="cursor-pointer truncate text-sm font-medium transition-colors hover:text-accent-foreground"
                        title="Click to edit title"
                      >
                        {thread.title}
                      </h3>
                      {thread.isPinned && (
                        <span className="text-xs text-muted-foreground">
                          📌
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {formatLastMessageTime(thread.lastMessageAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteThread(thread.uniqueId, e)}
                      disabled={isDeletingThread === thread.uniqueId}
                    >
                      {isDeletingThread === thread.uniqueId ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter hidden={!isAuthenticated}>
        <p className="text-center text-sm">
          {threads.length} conversation{threads.length !== 1 ? "s" : ""}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
};

export default ChatSidebar;
