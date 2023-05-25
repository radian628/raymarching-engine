export function colorArrayToHex(arr: [number, number, number]) {
  return "#" + arr.map((n) => n.toString(16).padStart(2, "0")).join("");
}

export function hexToColorArray(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function ColorInput(props: {
  value: () => [number, number, number];
  setValue: (n: [number, number, number]) => void;
}) {
  return (
    <input
      type="color"
      value={colorArrayToHex(props.value())}
      onChange={(e) => {
        props.setValue(hexToColorArray(e.currentTarget.value));
      }}
    ></input>
  );
}
