// ============================================================
// Operation Store – Track current/last operation + history
// ============================================================

import {
    getOperationHistory,
    insertOperation,
    updateOperationStatus,
} from '@/src/db/repository';
import type { OperationHistory, OperationStatus } from '@/src/types';
import { create } from 'zustand';

interface OperationState {
  currentOp: OperationHistory | null;
  history: OperationHistory[];
  isLoaded: boolean;

  loadHistory: () => Promise<void>;
  startOperation: (toolId: string, toolName: string, inputFiles: string[]) => Promise<string>;
  updateStatus: (
    id: string,
    status: OperationStatus,
    outputFile?: string,
    errorMessage?: string,
  ) => Promise<void>;
  clearCurrent: () => void;
}

export const useOperationStore = create<OperationState>((set, get) => ({
  currentOp: null,
  history: [],
  isLoaded: false,

  loadHistory: async () => {
    const history = await getOperationHistory(30);
    set({ history, isLoaded: true });
  },

  startOperation: async (toolId, toolName, inputFiles) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const op: OperationHistory = {
      id,
      toolId,
      toolName,
      inputFiles,
      status: 'processing',
      startedAt: new Date().toISOString(),
    };
    await insertOperation(op);
    set({ currentOp: op });
    return id;
  },

  updateStatus: async (id, status, outputFile, errorMessage) => {
    await updateOperationStatus(id, status, outputFile, errorMessage);
    set((state) => ({
      currentOp:
        state.currentOp?.id === id
          ? { ...state.currentOp, status, outputFile, errorMessage }
          : state.currentOp,
    }));
    // Refresh history
    await get().loadHistory();
  },

  clearCurrent: () => set({ currentOp: null }),
}));