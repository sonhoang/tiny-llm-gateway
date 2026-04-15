import fs from "fs";
import path from "path";
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const DATA_DIR = path.resolve(process.cwd(), "data");

function getKey(): Buffer {
  const hex = process.env.STORE_ENCRYPTION_KEY || "";
  if (hex.length !== 64) throw new Error("STORE_ENCRYPTION_KEY must be 32-byte hex (64 chars)");
  return Buffer.from(hex, "hex");
}

export function saveEncrypted(filename: string, data: unknown): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const json = Buffer.from(JSON.stringify(data), "utf8");
  const encrypted = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]);
  fs.writeFileSync(path.join(DATA_DIR, filename), payload);
}

export function loadEncrypted<T>(filename: string, fallback: T): T {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return fallback;
  const payload = fs.readFileSync(filepath);
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
