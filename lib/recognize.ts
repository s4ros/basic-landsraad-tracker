export const CREST_MAX_DISTANCE = 10;
export const CREST_MARGIN = 4;
export const NAME_MAX_DISTANCE = 2;

// tsconfig targets ES2017, which rejects 0n and 1n literals.
const zero = BigInt(0);
const one = BigInt(1);

export type CrestTemplate = { houseId: number; crestHash: bigint };

export type CellObservation = {
  row: number;
  column: number;
  text: string;
  crestHash: bigint | null;
};

export type ProposalReason = "empty" | "claimed" | "crest" | "name" | "conflict";

export type CellProposal = {
  row: number;
  column: number;
  houseId: number | null;
  reason: ProposalReason;
};

type HouseName = { id: number; name: string };

export function normalizeHouseText(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    const leftChar = left[i - 1];
    for (let j = 1; j <= right.length; j++) {
      const cost = leftChar === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[right.length];
}

export function hamming(left: bigint, right: bigint): number {
  let value = left ^ right;
  let count = 0;
  while (value > zero) {
    count += Number(value & one);
    value >>= one;
  }
  return count;
}

export function dhashFromGray(width: number, height: number, pixels: Uint8Array): bigint {
  if (width !== 9 || height !== 8) throw new Error("dhashFromGray expects width 9 and height 8");

  let hash = zero;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (pixels[y * 9 + x] > pixels[y * 9 + x + 1]) {
        hash |= one << BigInt(63 - (y * 8 + x));
      }
    }
  }
  return hash;
}

function matchName(text: string, houses: HouseName[]): number | null {
  const normalized = normalizeHouseText(text);
  if (normalized.length === 0) return null;

  let bestId: number | null = null;
  let bestDistance = NAME_MAX_DISTANCE + 1;
  let tied = false;
  for (const house of houses) {
    const distance = levenshtein(normalized, normalizeHouseText(house.name));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = house.id;
      tied = false;
    } else if (distance === bestDistance) {
      tied = true;
    }
  }
  if (tied || bestId === null) return null;
  return bestId;
}

function matchCrest(hash: bigint | null, templates: CrestTemplate[]): number | null {
  if (hash === null || templates.length === 0) return null;

  const bestByHouse = new Map<number, number>();
  for (const template of templates) {
    const distance = hamming(hash, template.crestHash);
    const current = bestByHouse.get(template.houseId);
    if (current === undefined || distance < current) bestByHouse.set(template.houseId, distance);
  }

  let bestId: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let secondDistance = Number.POSITIVE_INFINITY;
  for (const [houseId, distance] of bestByHouse) {
    if (distance < bestDistance) {
      secondDistance = bestDistance;
      bestDistance = distance;
      bestId = houseId;
    } else if (distance < secondDistance) {
      secondDistance = distance;
    }
  }

  if (bestId === null || bestDistance > CREST_MAX_DISTANCE) return null;
  if (secondDistance < bestDistance + CREST_MARGIN) return null;
  return bestId;
}

export function proposeCell(cell: CellObservation, houses: HouseName[], templates: CrestTemplate[]): CellProposal {
  const position = { row: cell.row, column: cell.column };
  if (normalizeHouseText(cell.text).includes("claimed")) {
    return { ...position, houseId: null, reason: "claimed" };
  }

  const named = matchName(cell.text, houses);
  const crested = matchCrest(cell.crestHash, templates);
  if (named !== null && crested !== null && named !== crested) {
    return { ...position, houseId: null, reason: "conflict" };
  }
  if (crested !== null) return { ...position, houseId: crested, reason: "crest" };
  if (named !== null) return { ...position, houseId: named, reason: "name" };
  return { ...position, houseId: null, reason: "empty" };
}
