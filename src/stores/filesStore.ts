// ============================================================
// Files Store – file management state
// ============================================================

import {
  deleteFile,
  getAllFiles,
  getFavoriteFiles,
  getRecentFiles,
  insertFile,
  toggleFavorite as toggleDBFavorite,
} from '@/src/db/repository';
import type { DeviceFile } from '@/src/types';
import PdfThumbnail from 'react-native-pdf-thumbnail';
import { create } from 'zustand';

interface FilesState {
  files: DeviceFile[];
  favorites: DeviceFile[];
  recentFiles: DeviceFile[];
  isLoaded: boolean;

  loadAll: () => Promise<void>;
  addFile: (file: DeviceFile) => Promise<void>;
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
      getAllFiles(),
      getFavoriteFiles(),
      getRecentFiles(20),
    ]);
    set({ files, favorites, recentFiles, isLoaded: true });
  },

  addFile: async (file) => {
    // Generate thumbnail for the file before persisting
    try {
      if (file.fileType === 'pdf') {
        const result = await PdfThumbnail.generate(file.uri, 1);
        if (result?.uri) {
          file = { ...file, thumbnail: result.uri };
        }
      } else if (file.fileType === 'image') {
        file = { ...file, thumbnail: file.uri };
      }
    } catch {
      // Thumbnail generation failed – store without thumbnail
    }

    await insertFile(file);
    await get().refresh();
  },

  removeFile: async (id) => {
    await deleteFile(id);
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      favorites: state.favorites.filter((f) => f.id !== id),
      recentFiles: state.recentFiles.filter((f) => f.id !== id),
    }));
  },

  toggleFavorite: async (id) => {
    await toggleDBFavorite(id);
    set((state) => {
      const updateList = (list: DeviceFile[]) =>
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
      getAllFiles(),
      getFavoriteFiles(),
      getRecentFiles(20),
    ]);
    set({ files, favorites, recentFiles });
  },
}));