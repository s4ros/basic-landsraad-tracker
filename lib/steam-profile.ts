const maxDisplayName = 80;

function isNonWhitespaceControl(char: string) {
  const code = char.codePointAt(0) ?? 0;
  const control = code <= 0x1f || code === 0x7f || (code >= 0x80 && code <= 0x9f);
  return control && !/\s/.test(char);
}

function sanitize(value: string) {
  let kept = "";
  for (const char of value) {
    if (isNonWhitespaceControl(char)) continue;
    kept += char;
  }
  return kept.trim().replace(/\s+/g, " ");
}

function limit(value: string) {
  const chars = Array.from(value);
  if (chars.length <= maxDisplayName) return value;
  return chars.slice(0, maxDisplayName).join("");
}

export function cleanDisplayName(value: string, fallback: string) {
  const cleaned = limit(sanitize(value));
  if (cleaned.length > 0) return cleaned;
  const cleanedFallback = limit(sanitize(fallback));
  if (cleanedFallback.length > 0) return cleanedFallback;
  return "Gracz";
}

export function steamNameFromProfileXml(xml: string) {
  const match = xml.match(/<steamID><!\[CDATA\[([\s\S]*?)\]\]><\/steamID>/);
  if (!match) return null;
  const name = match[1];
  if (name.length === 0 || Array.from(name).length > maxDisplayName) return null;
  return name;
}

export async function steamDisplayName(steamId: string) {
  const fallback = `Steam ${steamId}`;
  try {
    const response = await fetch(
      `https://steamcommunity.com/profiles/${encodeURIComponent(steamId)}/?xml=1`,
      { redirect: "manual", signal: AbortSignal.timeout(5000) },
    );
    if (response.status !== 200) return fallback;
    const parsed = steamNameFromProfileXml(await response.text());
    if (parsed === null) return fallback;
    return cleanDisplayName(parsed, fallback);
  } catch {
    return fallback;
  }
}
