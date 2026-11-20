import type { JSX } from "react";
import { placeHouseAction } from "@/app/tablica/actions";
import { houseMarkPath } from "@/lib/house-marks";

export function HousePicker(props: {
  worldId: string;
  row: number;
  column: number;
  label: string;
  houses: { id: number; name: string }[];
}): JSX.Element {
  if (props.houses.length === 0) {
    return (
      <span className="house-tile idle">
        <span className="sr">{props.label}, puste pole, brak wolnego rodu</span>
      </span>
    );
  }

  return (
    <details className="house-tile-pick">
      <summary className="house-tile idle">
        <span className="sr">{props.label}, puste pole. Wybierz ród.</span>
      </summary>
      <div className="house-pick-list">
        {props.houses.map((house) => {
          const mark = houseMarkPath(house.name);
          return (
            <form key={house.id} action={placeHouseAction}>
              <input type="hidden" name="worldId" value={props.worldId} />
              <input type="hidden" name="row" value={props.row} />
              <input type="hidden" name="column" value={props.column} />
              <input type="hidden" name="houseId" value={house.id} />
              <button type="submit">
                {mark ? <img src={mark} alt="" width={24} height={24} /> : null}
                {house.name}
              </button>
            </form>
          );
        })}
      </div>
    </details>
  );
}
