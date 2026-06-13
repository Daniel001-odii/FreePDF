// ============================================================
// Files Store – PDF file management state
// ============================================================

import {
    deletePDFFile,
    getAllPDFFiles,
    getFavoriteFiles,
    getRecentFiles,
    insertPDFFile,
    toggleFavorite as toggleDBFavorite,
} from '@/src/db/repository';
import type { PDFFile } from '@/src/types';
import { create } from 'zustand';

interface FilesState {
  files: PDFFile[];
  favorites: PDFFile[];
  recentFiles: PDFFile[];
  isLoaded: boolean;

  loadAll: () => Promise<void>;
  addFile: (file: PDFFile) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  files: [],
  favorites: [],
  recentFiles: [],
  isLoaded: false,

  loadAll: async () => {
    const [files, favorites, recentFiles] = await Promise.all([
      getAllPDFFiles(),
      getFavoriteFiles(),
      getRecentFiles(20),
    ]);
    set({ files, favorites, recentFiles, isLoaded: true });
  },

  addFile: async (file) => {
    await insertPDFFile(file);
    await get().refresh();
  },

  removeFile: async (id) => {
    await deletePDFFile(id);
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      favorites: state.favorites.filter((f) => f.id !== id),
      recentFiles: state.recentFiles.filter((f) => f.id !== id),
    }));
  },

  toggleFavorite: async (id) => {
    await toggleDBFavorite(id);
    set((state) => {
      const updateList = (list: PDFFile[]) =>
        list.map((f) =>
          f.id === id ? { ...f, isFavorite: !f.isFavorite } : f,
        );
      return {
        files: updateList(state.files),
        favorites: state.favorites.some((f) => f.id === id && f.isFavorite)
          ? state.favorites.filter((f) => f.id !== id)
          : [
              ...state.favorites,
              ...state.files
                .filter((f) => f.id === id)
                .map((f) => ({ ...f, isFavorite: true })),
            ],
        recentFiles: updateList(state.recentFiles),
      };
    });
  },

  refresh: async () => {
    const [files, favorites, recentFiles] = await Promise.all([
      getAllPDFFiles(),
      getFavoriteFiles(),
      getRecentFiles(20),
    ]);
    set({ files, favorites, recentFiles });
  },
}));