import { createSignal } from "solid-js";

export function NumberInput(props: {
  value: () => number;
  setValue: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number;
  default?: number;
  updateInRealTime?: boolean;
  slideMode?: "log";
  onSlideStart?: () => void;
  onSlideEnd?: () => void;
}) {
  const {
    min,
    max,
    step,
    sensitivity,
    defaultValue,
    updateInRealTime,
    slideMode,
  } = {
    min: props.min ?? -Infinity,
    max: props.max ?? Infinity,
    step: props.step ?? 1 / 2 ** 16,
    sensitivity: props.sensitivity ?? 1,
    defaultValue: props.default ?? 0,
    updateInRealTime: props.updateInRealTime ?? false,
    slideMode: props.slideMode,
  };

  let [delta, setDelta] = createSignal(0);

  let [oldValue, setOldValue] = createSignal(props.value());

  function transformNum(rawNum: number, movementX: number) {
    const x =
      slideMode == "log"
        ? rawNum * Math.exp(movementX * sensitivity)
        : rawNum + movementX * sensitivity;
    const steppedNum = Math.floor(x / step) * step;
    const clampedNum = Math.max(Math.min(steppedNum, max), min);
    return clampedNum;
  }

  return (
    <input
      onMouseDown={(e) => {
        e.currentTarget.requestPointerLock();
        props.onSlideStart?.();
        setOldValue(props.value());
      }}
      onMouseUp={(e) => {
        document.exitPointerLock();
        props.onSlideEnd?.();
        if (!updateInRealTime) {
          props.setValue(transformNum(props.value(), delta()));
        }
        setDelta(0);
      }}
      onMouseMove={(e) => {
        if (document.pointerLockElement === e.currentTarget) {
          setDelta(delta() + e.movementX);
          if (updateInRealTime) {
            props.setValue(transformNum(oldValue(), delta()));
          }
        }
      }}
      type="number"
      value={transformNum(props.value(), updateInRealTime ? 0 : delta())
        .toPrecision(6)
        .replace(/\.?0+$/g, "")}
      onChange={(e) => {
        const rawNum = Number(e.currentTarget.value);
        const clampedNum = transformNum(rawNum, 0);
        if (isNaN(clampedNum)) props.setValue(defaultValue);
        else props.setValue(clampedNum);
      }}
    ></input>
  );
}
