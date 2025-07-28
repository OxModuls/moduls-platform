import { create } from 'zustand';

export const useWalletModalStore = create((set) => ({
    isWalletModalOpen: false,
    openWalletModal: () => set({ isWalletModalOpen: true }),
    closeWalletModal: () => set({ isWalletModalOpen: false }),
})); 