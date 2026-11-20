import { houseMarkPath } from "@/lib/house-marks";

export function HouseMark({ name }: { name: string }) {
  const src = houseMarkPath(name);
  if (!src) return null;
  return <img className="house-mark" src={src} alt="" />;
}
