import { createSignal } from "solid-js";

export function BooleanInput(props: {
  value: () => boolean;
  setValue: (n: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={props.value()}
      onChange={(e) => {
        props.setValue(e.currentTarget.checked);
      }}
    ></input>
  );
}
