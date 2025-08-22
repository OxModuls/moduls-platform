import { useState, useMemo, useEffect } from "react";
import ChatTrigger from "./trigger";
import MiniChat from "./mini-chat";
import FullscreenChat from "./fullscreen-chat";

function ChatDock({ agent, openMini, onOpenMiniChange }) {
  const [isMiniOpen, setIsMiniOpen] = useState(!!openMini);
  const [isFullOpen, setIsFullOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  // Sync controlled prop
  useEffect(() => {
    if (typeof openMini === "boolean") {
      setIsMiniOpen(openMini);
    }
  }, [openMini]);

  const handleMiniOpenChange = (val) => {
    if (onOpenMiniChange) onOpenMiniChange(val);
    setIsMiniOpen(val);
  };

  return (
    <>
      {/* Bottom-left trigger */}
      <ChatTrigger agent={agent} onClick={() => handleMiniOpenChange(true)} />

      {/* Mini Chat */}
      {isMiniOpen && !isFullOpen && (
        <MiniChat
          agent={agent}
          selectedThreadId={selectedThreadId}
          onSelectThread={setSelectedThreadId}
          onMaximize={() => {
            setIsFullOpen(true);
            handleMiniOpenChange(false);
          }}
          onClose={() => handleMiniOpenChange(false)}
        />
      )}

      {/* Fullscreen Chat */}
      {isFullOpen && (
        <FullscreenChat
          agent={agent}
          selectedThreadId={selectedThreadId}
          onSelectThread={setSelectedThreadId}
          onRestore={() => {
            setIsFullOpen(false);
            handleMiniOpenChange(true);
          }}
          onClose={() => {
            setIsFullOpen(false);
            handleMiniOpenChange(false);
          }}
        />
      )}
    </>
  );
}

export default ChatDock;
