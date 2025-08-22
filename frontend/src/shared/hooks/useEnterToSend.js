import { useCallback } from "react";

/**
 * useEnterToSend
 * - Press Enter to send
 * - Shift+Enter inserts a newline
 * - Respects disabled state and trims empty messages
 */
export function useEnterToSend({ value, setValue, onSend, disabled }) {
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key !== "Enter") return;

            if (e.shiftKey) {
                // Allow newline
                return;
            }

            // Prevent default newline behavior on Enter (without shift)
            e.preventDefault();

            if (disabled) return;
            const text = (value || "").trim();
            if (!text) return;

            onSend(text);
            // Clear after successful queue
            if (typeof setValue === "function") {
                setValue("");
            }
        },
        [value, setValue, onSend, disabled]
    );

    return { handleKeyDown };
}


