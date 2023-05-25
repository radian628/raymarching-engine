import { Key } from "@solid-primitives/keyed";
import { createSignal, For, JSX } from "solid-js";

export function ArrayInput<T extends { id: number }>(props: {
  value: () => T[];
  setValue: (t: T[]) => void;
  children: (props: {
    value: () => T;
    setValue: (t: T) => void;
    index: number;
    deleteButton: JSX.Element;
  }) => JSX.Element;
  defaultValue: Omit<T, "id">;
}) {
  const [currentID, setCurrentID] = createSignal(0);

  return (
    <div class="array-input">
      <ul>
        <Key each={props.value()} by="id">
          {(elem, i) => (
            <li>
              <props.children
                deleteButton={
                  <button
                    onClick={(t) => {
                      props.setValue(props.value().filter((e, j) => j != i()));
                    }}
                  >
                    X
                  </button>
                }
                value={elem}
                setValue={(t) => {
                  props.setValue(
                    props.value().map((e, j) => (j == i() ? t : e))
                  );
                }}
                index={i()}
              ></props.children>
            </li>
          )}
        </Key>
      </ul>
      <button
        onClick={() => {
          props.setValue([
            //@ts-ignore
            ...props.value(),
            //@ts-ignore
            { ...props.defaultValue, id: currentID() },
          ]);
          setCurrentID(currentID() + 1);
        }}
      >
        Add
      </button>
    </div>
  );
}
