import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

function ChatTrigger({ agent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group fixed right-4 bottom-8 z-20 cursor-pointer rounded-full bg-gradient-to-br from-accent/20 to-accent/10 p-3 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-accent/25 active:scale-95 active:shadow-lg"
      title="Chat"
    >
      {/* Animated background ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Main icon container */}
      <div className="relative z-10 flex items-center justify-center">
        <MessageCircle className="size-12 fill-accent/40 stroke-accent stroke-1 text-accent transition-all duration-300 group-hover:fill-accent/80 group-hover:stroke-accent/80 group-active:fill-accent/90 group-active:stroke-accent/90 md:size-16" />
      </div>

      {/* Agent avatar overlay */}
      <div className="absolute top-[50%] left-[50%] z-20 translate-[-50%]">
        <Avatar className="size-8 ring-2 ring-background transition-transform duration-300 group-active:scale-95 md:size-10">
          <AvatarImage src={agent?.logoUrl} />
          <AvatarFallback className="text-xs font-semibold">
            {agent?.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Pulse animation when closed */}
      <div className="absolute inset-0 animate-ping rounded-full bg-accent/20 opacity-20" />
    </button>
  );
}

export default ChatTrigger;
