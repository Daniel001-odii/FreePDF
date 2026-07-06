// ============================================================
// Repository Layer – CRUD operations on SQLite tables
// ============================================================

import { getDatabase } from '@/src/db/database';
import type {
  DeviceFile,
  FileType,
  OperationHistory,
  OperationStatus,
  ThemeMode,
  UserSettings,
} from '@/src/types';

// -----------------------------------------------------------
// Files
// -----------------------------------------------------------

export async function insertFile(file: DeviceFile): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO pdf_files
       (id, uri, name, size, file_type, page_count, created_at, modified_at, is_favorite, thumbnail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      file.id,
      file.uri,
      file.name,
      file.size,
      file.fileType,
      file.pageCount ?? 0,
      file.createdAt,
      file.modifiedAt,
      file.isFavorite ? 1 : 0,
      file.thumbnail ?? null,
    ],
  );
}

/** @deprecated Use insertFile instead */
export const insertPDFFile = insertFile;

export async function getAllFiles(): Promise<DeviceFile[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    uri: string;
    name: string;
    size: number;
    file_type: string;
    page_count: number;
    created_at: string;
    modified_at: string;
    is_favorite: number;
    thumbnail: string | null;
  }>(
    `SELECT * FROM pdf_files ORDER BY modified_at DESC`,
  );
  return rows.map(mapRowToDeviceFile);
}

/** @deprecated Use getAllFiles instead */
export const getAllPDFFiles = getAllFiles;

export async function getFileById(id: string): Promise<DeviceFile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    uri: string;
    name: string;
    size: number;
    file_type: string;
    page_count: number;
    created_at: string;
    modified_at: string;
    is_favorite: number;
    thumbnail: string | null;
  }>(`SELECT * FROM pdf_files WHERE id = ?`, [id]);
  return row ? mapRowToDeviceFile(row) : null;
}

/** @deprecated Use getFileById instead */
export const getPDFFileById = getFileById;

export async function renameFile(id: string, newName: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pdf_files
        SET name = ?,
            modified_at = datetime('now')
      WHERE id = ?`,
    [newName, id],
  );
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM pdf_files WHERE id = ?`, [id]);
}

/** Update the stored URI and size of a file (e.g. after baking edits). */
export async function updateFileUri(
  id: string,
  newUri: string,
  newSize: number,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pdf_files
        SET uri = ?,
            size = ?,
            modified_at = datetime('now')
      WHERE id = ?`,
    [newUri, newSize, id],
  );
}


/** @deprecated Use deleteFile instead */
export const deletePDFFile = deleteFile;

export async function toggleFavorite(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pdf_files
        SET is_favorite = CASE WHEN is_favorite = 0 THEN 1 ELSE 0 END,
            modified_at = datetime('now')
      WHERE id = ?`,
    [id],
  );
}

/** @deprecated Use toggleFavorite instead */
export const toggleDBFavorite = toggleFavorite;

export async function getFavoriteFiles(): Promise<DeviceFile[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    uri: string;
    name: string;
    size: number;
    file_type: string;
    page_count: number;
    created_at: string;
    modified_at: string;
    is_favorite: number;
    thumbnail: string | null;
  }>(`SELECT * FROM pdf_files WHERE is_favorite = 1 ORDER BY modified_at DESC`);
  return rows.map(mapRowToDeviceFile);
}

export async function getRecentFiles(limit: number = 10): Promise<DeviceFile[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    uri: string;
    name: string;
    size: number;
    file_type: string;
    page_count: number;
    created_at: string;
    modified_at: string;
    is_favorite: number;
    thumbnail: string | null;
  }>(
    `SELECT * FROM pdf_files ORDER BY modified_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map(mapRowToDeviceFile);
}

// -----------------------------------------------------------
// Operation History
// -----------------------------------------------------------

export async function insertOperation(op: OperationHistory): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO operation_history
       (id, tool_id, tool_name, input_files, output_file, status, started_at, completed_at, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      op.id,
      op.toolId,
      op.toolName,
      JSON.stringify(op.inputFiles),
      op.outputFile ?? null,
      op.status,
      op.startedAt,
      op.completedAt ?? null,
      op.errorMessage ?? null,
    ],
  );
}

export async function updateOperationStatus(
  id: string,
  status: OperationStatus,
  outputFile?: string,
  errorMessage?: string,
): Promise<void> {
  const db = await getDatabase();
  const completedAt = status === 'completed' || status === 'failed'
    ? new Date().toISOString()
    : null;
  await db.runAsync(
    `UPDATE operation_history
        SET status = ?,
            output_file = COALESCE(?, output_file),
            error_message = COALESCE(?, error_message),
            completed_at = COALESCE(?, completed_at)
      WHERE id = ?`,
    [status, outputFile ?? null, errorMessage ?? null, completedAt, id],
  );
}

export async function getOperationHistory(
  limit: number = 20,
): Promise<OperationHistory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    tool_id: string;
    tool_name: string;
    input_files: string;
    output_file: string | null;
    status: OperationStatus;
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
  }>(
    `SELECT * FROM operation_history ORDER BY started_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    toolId: r.tool_id,
    toolName: r.tool_name,
    inputFiles: JSON.parse(r.input_files),
    outputFile: r.output_file ?? undefined,
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at ?? undefined,
    errorMessage: r.error_message ?? undefined,
  }));
}

// -----------------------------------------------------------
// User Settings
// -----------------------------------------------------------

export async function getUserSettings(): Promise<UserSettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    theme: ThemeMode;
    default_compression_quality: number;
    auto_save_results: number;
    show_premium_badges: number;
    language: string;
  }>(`SELECT * FROM user_settings WHERE id = 1`);

  if (!row) {
    return {
      theme: 'system',
      defaultCompressionQuality: 80,
      autoSaveResults: true,
      showPremiumBadges: true,
      language: 'en',
    };
  }

  return {
    theme: row.theme,
    defaultCompressionQuality: row.default_compression_quality,
    autoSaveResults: row.auto_save_results === 1,
    showPremiumBadges: row.show_premium_badges === 1,
    language: row.language,
  };
}

export async function updateUserSettings(
  partial: Partial<UserSettings>,
): Promise<void> {
  const db = await getDatabase();
  const current = await getUserSettings();
  const merged = { ...current, ...partial };

  await db.runAsync(
    `UPDATE user_settings
        SET theme = ?,
            default_compression_quality = ?,
            auto_save_results = ?,
            show_premium_badges = ?,
            language = ?
      WHERE id = 1`,
    [
      merged.theme,
      merged.defaultCompressionQuality,
      merged.autoSaveResults ? 1 : 0,
      merged.showPremiumBadges ? 1 : 0,
      merged.language,
    ],
  );
}

// -----------------------------------------------------------
// Favorite Tools
// -----------------------------------------------------------

export async function getFavoriteToolIds(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ tool_id: string }>(
    `SELECT tool_id FROM favorite_tools`,
  );
  return rows.map((r) => r.tool_id);
}

export async function addFavoriteTool(toolId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO favorite_tools (tool_id, added_at)
     VALUES (?, datetime('now'))`,
    [toolId],
  );
}

export async function removeFavoriteTool(toolId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM favorite_tools WHERE tool_id = ?`, [toolId]);
}

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function mapRowToDeviceFile(row: {
  id: string;
  uri: string;
  name: string;
  size: number;
  file_type: string;
  page_count: number;
  created_at: string;
  modified_at: string;
  is_favorite: number;
  thumbnail: string | null;
}): DeviceFile {
  return {
    id: row.id,
    uri: row.uri,
    name: row.name,
    size: row.size,
    fileType: (row.file_type as FileType) || 'pdf',
    pageCount: row.page_count,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
    isFavorite: row.is_favorite === 1,
    thumbnail: row.thumbnail ?? undefined,
  };
}