import { create } from "zustand";

export const useWalletModalStore = create((set) => ({
  isWalletModalOpen: false,
  openWalletModal: () => set({ isWalletModalOpen: true }),
  closeWalletModal: () => set({ isWalletModalOpen: false }),
  setWalletModal: (open) => set({ isWalletModalOpen: open }),
}));

export const useThreadStore = create((set, get) => ({
  selectedThreadId: null,
  setSelectedThreadId: (threadId) => set({ selectedThreadId: threadId }),
  clearSelectedThread: () => set({ selectedThreadId: null }),

  // Helper to check if a thread is selected
  isThreadSelected: (threadId) => get().selectedThreadId === threadId,

  // Get current selected thread ID
  getSelectedThreadId: () => get().selectedThreadId,
}));

export const useSignatureModalStore = create((set) => ({
  isOpen: false,
  message: null,
  onProceed: null,
  onCancel: null,

  openSignatureModal: (message, onProceed, onCancel) => set({
    isOpen: true,
    message,
    onProceed,
    onCancel
  }),

  closeSignatureModal: () => set({
    isOpen: false,
    message: null,
    onProceed: null,
    onCancel: null
  }),

  // Update message details (for multiple calls)
  updateMessage: (message) => set({ message }),
}));

