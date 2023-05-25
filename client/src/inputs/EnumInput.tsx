import { For } from "solid-js";

export function EnumInput<T>(props: {
  value: () => T;
  setValue: (t: T) => void;
  variants: [T, string][];
}) {
  return (
    <div class="enum-input">
      <For each={props.variants}>
        {(elem, i) => (
          <button
            class={props.value() == elem[0] ? "selected-variant" : "variant"}
            onClick={() => {
              props.setValue(elem[0]);
            }}
          >
            {elem[1]}
          </button>
        )}
      </For>
    </div>
  );
}
