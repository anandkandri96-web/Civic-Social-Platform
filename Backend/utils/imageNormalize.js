/**
 * Normalize legacy string URLs and image objects to { url, cloudinaryId }.
 */
function normalizeImageItem(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const url = raw.trim();
    if (!url) return null;
    return { url, cloudinaryId: extractCloudinaryPublicId(url) || "" };
  }
  if (typeof raw === "object" && raw.url) {
    return {
      url: String(raw.url).trim(),
      cloudinaryId: String(raw.cloudinaryId || raw.cloudinary_id || extractCloudinaryPublicId(raw.url) || "").trim(),
    };
  }
  return null;
}

function extractCloudinaryPublicId(url) {
  const s = String(url || "");
  const m = s.match(/\/upload\/(?:v\d+\/)?([^?#]+)/);
  if (!m) return "";
  return decodeURIComponent(m[1] || "").replace(/\.[a-zA-Z0-9]+$/, "");
}

function normalizeImageArray(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const item of arr) {
    const n = normalizeImageItem(item);
    if (n && n.url) out.push(n);
  }
  return out;
}

function collectCloudinaryIdsFromImages(arr) {
  const ids = [];
  for (const item of normalizeImageArray(arr)) {
    if (item.cloudinaryId) ids.push(item.cloudinaryId);
  }
  return ids;
}

module.exports = {
  normalizeImageItem,
  normalizeImageArray,
  extractCloudinaryPublicId,
  collectCloudinaryIdsFromImages,
};
