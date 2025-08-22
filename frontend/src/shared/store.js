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

