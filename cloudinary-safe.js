const CLOUD_NAME = "your_cloud_name";
const DEFAULT_ASSET_FOLDER = "portal/assets";

const allowedMime = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/webm", "video/quicktime"]
};

function validateAsset(file, { maxBytes = 5 * 1024 * 1024, kind = "image" } = {}) {
  if (!(file instanceof File)) throw new Error("File tidak valid");

  const mimeList = allowedMime[kind] || [];
  if (!mimeList.includes(file.type)) {
    throw new Error(`Tipe file ${file.type} tidak diizinkan untuk ${kind}`);
  }

  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(`Ukuran file harus 0 < size <= ${maxBytes} bytes`);
  }

  return true;
}

async function getCloudinarySignature({ folder, resourceType = "image" }) {
  const res = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ folder, resourceType })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Gagal mendapatkan signature Cloudinary: ${error}`);
  }

  return res.json();
}

async function uploadAssetToCloudinary(file, { folder = DEFAULT_ASSET_FOLDER, kind = "image" } = {}) {
  validateAsset(file, {
    maxBytes: kind === "video" ? 50 * 1024 * 1024 : 5 * 1024 * 1024,
    kind
  });

  const { apiKey, signature, timestamp, cloudName } = await getCloudinarySignature({
    folder,
    resourceType: kind
  });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName || CLOUD_NAME}/${kind}/upload`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    body: form
  });

  const data = await res.json();
  if (!res.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || "Upload Cloudinary gagal");
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    resourceType: kind,
    format: data.format,
    bytes: data.bytes
  };
}

async function deleteAssetFromCloudinary({ publicId, resourceType = "image" }) {
  if (!publicId) throw new Error("publicId wajib diisi");

  const res = await fetch("/api/cloudinary/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ publicId, resourceType })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hapus asset gagal: ${text}`);
  }

  return res.json();
}

window.cloudinarySafe = {
  uploadAssetToCloudinary,
  deleteAssetFromCloudinary,
  validateAsset
};
