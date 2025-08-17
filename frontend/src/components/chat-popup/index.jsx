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
          className="group data-[popover-open=false]:animate-float fixed right-4 bottom-8 z-20 cursor-pointer rounded-full bg-gradient-to-br from-accent/20 to-accent/10 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-accent/25 active:scale-95 active:shadow-lg"
        >
          {/* Animated background ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Main icon container */}
          <div className="relative z-10 flex items-center justify-center">
            <MessageCircle className="size-7 fill-accent/60 stroke-accent text-accent transition-all duration-300 group-hover:fill-accent/80 group-hover:stroke-accent/80 group-active:fill-accent/90 group-active:stroke-accent/90 md:size-8" />
          </div>

          {/* Agent avatar overlay */}
          <div className="absolute -top-1 -right-1 z-20">
            <Avatar className="size-7 ring-2 ring-background transition-transform duration-300 group-hover:scale-110 group-active:scale-95 md:size-8">
              <AvatarImage src={agent.logoUrl} />
              <AvatarFallback className="text-xs font-semibold">
                {agent.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Pulse animation when closed */}
          {!open && (
            <div className="absolute inset-0 animate-ping rounded-full bg-accent/20 opacity-20" />
          )}
        </button>
      </PopoverTrigger>
      <div hidden={!open} className={`fixed inset-0 z-10 bg-black/50`} />

      {fullScreen && (
        <PopoverAnchor className="fixed top-0 left-0"></PopoverAnchor>
      )}

      <PopoverContent
        className="right-4 flex max-h-[calc(100vh-12rem)] min-h-[300px] w-screen max-w-[calc(100vw-2rem)] p-0 transition-all duration-200 data-[fullscreen=true]:h-screen md:w-[calc(16rem+28rem)] data-[fullscreen=true]:md:w-screen"
        data-fullscreen={fullScreen}
        side="top"
        align="end"
        sideOffset={30}
        alignOffset={-20}
        avoidCollisions={true}
        collisionBoundary={document.body}
        collisionPadding={30}
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
