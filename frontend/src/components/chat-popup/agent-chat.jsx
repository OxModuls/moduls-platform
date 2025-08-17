import { useIsMobile } from "@/hooks/use-mobile";
import { useBalance } from "wagmi";
import {
  Copy,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  X,
  MessageCircle,
  PanelLeft,
} from "lucide-react";

import { ellipsizeAddress, writeToClipboard } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatBigIntToUnits } from "../../lib/utils";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../shared/hooks/useAuth";
import {
  useCreateThread,
  useCreateMessage,
  useThreadMessages,
} from "../../shared/hooks/useChat";
import { toast } from "sonner";
import { Button } from "../ui/button";

// Utility function to format relative time
const formatRelativeTime = (date) => {
  const now = new Date();
  const messageDate = new Date(date);
  const diffInSeconds = Math.floor((now - messageDate) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else {
    return messageDate.toLocaleDateString();
  }
};

const AgentChat = ({
  agent,
  selectedThreadId,
  fullScreen,
  onFullScreenChange,
  onOpenChange,
  onThreadCreated,
  onSidebarToggle,
  sidebarOpen,
}) => {
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuth();

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);
  const textareaRef = useRef(null);

  // Chat mutations
  const createThreadMutation = useCreateThread();
  const createMessageMutation = useCreateMessage();

  // Fetch messages for selected thread
  const { data: messagesData, isLoading: messagesLoading } = useThreadMessages(
    selectedThreadId,
    { enabled: !!selectedThreadId },
  );

  const messages = messagesData?.data?.messages || [];

  const { data: agentWalletBalance } = useBalance({
    address: agent.walletAddress,
  });

  // Predefined prompt suggestions for each modul type
  const modulTypePrompts = {
    GAMING_BUDDY: [
      "Start a new game 🎮",
      "Show me available games 🎲",
      "What's my gaming score? 🏆",
    ],
    TRADING_ASSISTANT: [
      "Analyze market trends 📊",
      "Get trading signals 📈",
      "Portfolio performance review 📋",
    ],
    MEME: [
      "Show meme trends 🚀",
      "Community sentiment 📢",
      "Viral meme analysis 🔥",
    ],
    PORTFOLIO_WATCHER: [
      "Portfolio overview 📈",
      "Asset allocation 📊",
      "Performance metrics 📋",
    ],
    SOCIAL_SENTINEL: [
      "Search social trends 🔍",
      "Keyword analysis 📝",
      "Sentiment overview 😊",
    ],
  };

  // Get prompts for the current agent's modul type, fallback to generic prompts
  const promptSuggestions = modulTypePrompts[agent.modulType] || [
    "What can you do? 🤔",
    "How do I use this? ❓",
    "Show me features ✨",
  ];

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setChatInput(suggestion);
    // Focus the textarea after setting the value
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle start chat with race condition protection
  const handleStartChat = async () => {
    if (!chatInput.trim() || isStartingChat || !isAuthenticated) {
      if (!isAuthenticated) {
        toast.error("Please connect your wallet to start chatting");
        return;
      }
      return;
    }

    setIsStartingChat(true);

    try {
      let threadId = selectedThreadId;

      // Create new thread if none exists
      if (!threadId) {
        const threadResult = await createThreadMutation.mutateAsync({
          agentId: agent.uniqueId,
          title: `New conversation`,
          tags: [agent.modulType],
        });
        threadId = threadResult.data.uniqueId;
        // Notify parent component about the new thread
        if (onThreadCreated) {
          onThreadCreated(threadId);
        }
      }

      // Send the message
      await createMessageMutation.mutateAsync({
        threadId,
        messageData: {
          content: chatInput,
          messageType: "text",
        },
      });

      // Clear input after successful send
      setChatInput("");

      // Removed toast.success("Message sent!") to avoid showing on every message
    } catch (error) {
      console.error("Failed to start chat:", error);
      toast.error("Failed to send message");
    } finally {
      setIsStartingChat(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && textareaRef.current) {
      textareaRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  return (
    <main className="flex h-full max-h-[calc(100vh-12rem)] flex-col overflow-hidden p-2">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b pb-3">
        <div className="flex items-center gap-3">
          <button
            className="cursor-pointer"
            onClick={() => onSidebarToggle((prev) => !prev)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-6" />
            ) : (
              <PanelLeft className="size-6" />
            )}
          </button>

          <div className="flex items-center gap-3">
            <Avatar className="size-11 border-2 border-accent">
              <AvatarImage src={agent.logoUrl} />
              <AvatarFallback>
                {agent.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="font-medium">{agent.name}</p>
              <div className="flex items-center gap-1">
                <span className="">
                  {isMobile
                    ? ellipsizeAddress(agent.walletAddress, 4, 2)
                    : ellipsizeAddress(agent.walletAddress, 4, 4)}
                </span>
                <button
                  className="cursor-pointer"
                  onClick={() => writeToClipboard(agent.walletAddress)}
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="md:ml-2">
            {!!agentWalletBalance && (
              <div className="rounded-lg bg-neutral-700 px-2 py-1 text-sm">
                <span>
                  {Number(
                    formatBigIntToUnits(
                      agentWalletBalance.value,
                      agentWalletBalance.decimals,
                    ),
                  ).toFixed(6)}
                </span>{" "}
                SEI
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => onFullScreenChange(!fullScreen)}
            className="cursor-pointer"
          >
            {fullScreen ? (
              <Minimize2 className="size-5" />
            ) : (
              <Maximize2 className="size-5" />
            )}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* separator line*/}
      <Separator className="my-2" />

      {/* Messages Area */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="custom-scrollbar h-full max-h-[calc(100vh-20rem)] space-y-4 overflow-x-hidden overflow-y-auto p-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                Loading messages...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[45vh] flex-1 items-center justify-center">
              <div className="mx-auto max-w-md">
                <div className="flex flex-col items-center justify-center gap-5 px-4">
                  <div className="text-center">
                    {/* Show default chat input box in mini mode OR when thread is selected in full screen */}
                    {fullScreen === false || selectedThreadId ? (
                      <>
                        <h2 className="text-xl font-semibold">
                          What can I help you with?
                        </h2>
                        <div className="mt-4 w-full">
                          <Textarea
                            ref={textareaRef}
                            placeholder="Ask me anything"
                            className="w-full"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleStartChat();
                              }
                            }}
                          />
                          <button
                            className={`from-logo bg-button-gradient mt-3 w-full cursor-pointer rounded-lg py-2 font-medium ${
                              !chatInput.trim() ||
                              isStartingChat ||
                              !isAuthenticated
                                ? "cursor-not-allowed opacity-50"
                                : ""
                            }`}
                            onClick={handleStartChat}
                            disabled={
                              !chatInput.trim() ||
                              isStartingChat ||
                              !isAuthenticated
                            }
                          >
                            {isStartingChat ? "Starting..." : "Start Chat"}
                          </button>
                        </div>
                        <div className="mt-6 flex w-full justify-center">
                          <div className="flex w-full flex-wrap justify-center gap-1.5 overflow-hidden">
                            {promptSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                className="cursor-pointer rounded-xl bg-neutral-800 px-2 py-1 text-sm break-words transition-colors hover:bg-neutral-700"
                                onClick={() =>
                                  handleSuggestionClick(suggestion)
                                }
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-4 flex justify-center">
                          <div className="rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 p-6">
                            <MessageCircle className="h-12 w-12 text-red-400" />
                          </div>
                        </div>
                        <h2 className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-2xl font-bold text-transparent">
                          Start a Conversation
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Choose a conversation from the sidebar or create a new
                          one to begin chatting
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Display existing messages
            <div className="w-full max-w-full space-y-4">
              {messages.map((message) => (
                <div
                  key={message.uniqueId}
                  className={`flex w-full gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={agent.logoUrl} />
                      <AvatarFallback>
                        {agent.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[90%] rounded-lg px-4 py-2 sm:max-w-[85%] md:max-w-[80%] lg:max-w-[80%] ${
                      message.role === "user"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="word-break-all overflow-hidden text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(message.createdAt)}
                    </p>
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex shrink-0 gap-3 border-t p-4">
        <div className="min-w-0 flex-1">
          <Textarea
            ref={textareaRef}
            placeholder="Type your message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleStartChat();
              }
            }}
            className="min-h-0 resize-none"
            rows={1}
          />
        </div>
        <Button
          onClick={handleStartChat}
          disabled={!chatInput.trim() || isStartingChat}
          className="shrink-0"
        >
          {isStartingChat ? "Sending..." : "Send"}
        </Button>
      </div>
    </main>
  );
};

export default AgentChat;
