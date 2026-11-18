export function HouseLegend() {
  return (
    <ul className="board-legend">
      <li>
        <span className="swatch" aria-hidden="true"></span>
        Szary — zadania trwają
      </li>
      <li>
        <span className="swatch ready" aria-hidden="true"></span>
        Złoty — nagroda do odebrania
      </li>
      <li>
        <span className="swatch collected" aria-hidden="true"></span>
        Zielony — nagroda odebrana
      </li>
    </ul>
  );
}
