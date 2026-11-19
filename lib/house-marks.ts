import { readdirSync } from "node:fs";
import path from "node:path";

function assetSlug(name: string) {
  return name === "Spinnette" ? "spinette" : name.toLowerCase();
}

function isMarkFile(name: string, file: string) {
  const catalog = name.toLowerCase();
  const asset = assetSlug(name);
  const lower = file.toLowerCase();
  return (
    lower === `${catalog}.svg` ||
    lower === `${catalog}.png` ||
    lower === `${catalog}.webp` ||
    lower === `t_ui_iconslandsraadfactionhouse${asset}_d.webp`
  );
}

export function houseMarkFile(name: string, files: readonly string[]): string | null {
  const matches = files.filter((file) => isMarkFile(name, file));
  if (matches.length !== 1) return null;
  return `/houses/${matches[0]}`;
}

export function houseMarkPath(name: string): string | null {
  let files: string[];
  try {
    files = readdirSync(path.join(process.cwd(), "public/houses"));
  } catch {
    return null;
  }
  return houseMarkFile(name, files);
}
