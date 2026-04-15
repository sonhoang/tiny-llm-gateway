import crypto from "crypto";
import { saveEncrypted, loadEncrypted } from "./cryptoStore.service";

const FILE = "auth_keys.enc";

export interface GatewayKey {
  key: string;
  name: string;
  createdAt: string;
  lastUsed: string | null;
  active: boolean;
}

function load(): GatewayKey[] {
  return loadEncrypted<GatewayKey[]>(FILE, []);
}

function save(keys: GatewayKey[]): void {
  saveEncrypted(FILE, keys);
}

export function createKey(name: string): GatewayKey {
  const keys = load();
  const newKey: GatewayKey = {
    key: "sk-gw-" + crypto.randomBytes(24).toString("base64url"),
    name,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    active: true
  };
  keys.push(newKey);
  save(keys);
  return newKey;
}

export type ListedGatewayKey = Omit<GatewayKey, "key"> & { key: string };

export function listKeys(): ListedGatewayKey[] {
  return load().map(({ key, ...rest }) => ({
    ...rest,
    key: key.slice(0, 10) + "..." + key.slice(-4)
  }));
}

export function revokeKey(prefix: string): boolean {
  const keys = load();
  const idx = keys.findIndex(k => k.key.startsWith(prefix));
  if (idx === -1) return false;
  keys[idx].active = false;
  save(keys);
  return true;
}

export function validateKey(raw: string): GatewayKey | null {
  const keys = load();
  const found = keys.find(k => k.key === raw && k.active);
  if (!found) return null;
  found.lastUsed = new Date().toISOString();
  save(keys);
  return found;
}
