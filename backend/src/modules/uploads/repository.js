const pool = require('../../config/db');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

async function updateAvatarUrl(userId, avatarUrl) {
  await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [
    avatarUrl,
    userId,
  ]);
}

async function saveImageMetadata(
  userId,
  fileName,
  filePath,
  mimeType,
  fileSize
) {
  const result = await pool.query(
    `
      INSERT INTO image_metadata (
        user_id,
        file_name,
        file_path,
        mime_type,
        file_size
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [userId, fileName, filePath, mimeType, fileSize]
  );

  return result.rows[0];
}

async function findImageByFileName(userId, fileName) {
  const result = await pool.query(
    `
      SELECT *
      FROM image_metadata
      WHERE user_id = $1
        AND file_name = $2
      LIMIT 1
    `,
    [userId, fileName]
  );

  return result.rows[0] || null;
}

async function deleteImageMetadata(imageId) {
  const result = await pool.query(
    `
      DELETE FROM image_metadata
      WHERE id = $1
      RETURNING *
    `,
    [imageId]
  );

  return result.rows[0] || null;
}

async function deleteFile(dbSavedPath) {
  const projectRoot = path.resolve(__dirname, '..', '..', '..');

  const uploadsRoot = path.resolve(projectRoot, config.uploadDir);

  // file_path is stored as /uploads/fileName
  const safeFileName = path.basename(dbSavedPath);
  const absolutePath = path.resolve(uploadsRoot, safeFileName);

  const relative = path.relative(uploadsRoot, absolutePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Directory traversal attempt detected');
  }

  try {
    await fs.promises.unlink(absolutePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }

    console.warn(
      `[deleteFile] File not found, skipping unlink: ${absolutePath}`
    );
  }
}

module.exports = {
  updateAvatarUrl,
  saveImageMetadata,
  findImageByFileName,
  deleteImageMetadata,
  deleteFile,
};
