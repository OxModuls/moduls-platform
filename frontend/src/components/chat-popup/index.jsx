import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { PopoverAnchor } from "@radix-ui/react-popover";
import { Separator } from "../ui/separator";
import ChatSidebar from "./chat-sidebar";
import AgentChat from "./agent-chat";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageCircle } from "lucide-react";

const ChatPopup = ({ open, onOpenChange, agent }) => {
  const [fullScreen, setFullScreen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleThreadSelect = (threadId) => {
    setSelectedThreadId(threadId);
  };

  const handleThreadCreated = (threadId) => {
    setSelectedThreadId(threadId);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <button
          data-popover-open={open}
          className="cursor-pointe fixed right-4 bottom-16 z-20 data-[popover-open=false]:animate-pulse-bounce"
        >
          <MessageCircle className="size-16 fill-accent/50 stroke-1 text-accent md:size-20" />
          <Avatar className="absolute top-[50%] left-[50%] z-10 size-11 translate-x-[-50%] translate-y-[-50%] md:size-14">
            <AvatarImage src={agent.logoUrl} />
            <AvatarFallback>
              {agent.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <div hidden={!open} className={`fixed inset-0 z-10 bg-black/50`} />

      {fullScreen && (
        <PopoverAnchor className="fixed top-0 left-0"></PopoverAnchor>
      )}

      <PopoverContent
        className="flex w-screen p-0 transition-all duration-200 data-[fullscreen=true]:h-screen md:w-[calc(var(--sidebar-width)+28rem)] data-[fullscreen=true]:md:w-screen"
        data-fullscreen={fullScreen}
      >
        <div className="flex h-full w-full">
          {/* Desktop Sidebar - shares width */}
          <div
            className={`hidden h-full transition-all duration-300 ease-in-out md:block ${
              sidebarOpen ? "w-64" : "w-0"
            } shrink-0 overflow-hidden border-r bg-sidebar`}
          >
            <ChatSidebar
              agent={agent}
              selectedThreadId={selectedThreadId}
              onThreadSelect={handleThreadSelect}
            />
          </div>

          {/* Mobile Sidebar - overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="absolute top-0 left-0 h-full w-64 border-r bg-sidebar">
                <ChatSidebar
                  agent={agent}
                  selectedThreadId={selectedThreadId}
                  onThreadSelect={handleThreadSelect}
                />
              </div>
            </div>
          )}

          {/* Separator - only on desktop when sidebar is open */}
          {sidebarOpen && (
            <div className="hidden md:block">
              <Separator
                orientation="vertical"
                className="h-full shrink-0 bg-border"
              />
            </div>
          )}

          {/* Main content area */}
          <div className="min-w-0 flex-1">
            <AgentChat
              agent={agent}
              selectedThreadId={selectedThreadId}
              fullScreen={fullScreen}
              onFullScreenChange={setFullScreen}
              onOpenChange={onOpenChange}
              onThreadCreated={handleThreadCreated}
              onSidebarToggle={setSidebarOpen}
              sidebarOpen={sidebarOpen}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ChatPopup;
