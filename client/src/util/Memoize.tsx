import { createEffect, createSignal, untrack } from "solid-js";

type GenericMap<K, V> = {
  get: (key: K) => V | undefined;
  set: (key: K, value: V) => void;
  delete: (key: K) => void;
};

export function createGenericMap<K, V>(
  hash: (key: K) => number,
  eq: (a: K, b: K) => boolean
): GenericMap<K, V> {
  const underlyingMap = new Map<number, [K, V][]>();

  return {
    get(k) {
      const item = underlyingMap
        .get(hash(k))
        ?.find((entry) => eq(entry[0], k))?.[1];
      return item;
    },
    set(k, v) {
      let hashk = hash(k);
      let mapEntry = underlyingMap.get(hashk);
      if (!mapEntry) {
        mapEntry = [];
        underlyingMap.set(hashk, mapEntry);
      }
      const existingIndex = mapEntry.findIndex((item) => eq(item[0], k));
      if (existingIndex != -1) mapEntry.splice(existingIndex, 1);
      mapEntry.push([k, v]);
    },
    delete(k) {
      let hashk = hash(k);
      let mapEntry = underlyingMap.get(hashk);
      if (!mapEntry) return;
      const existingIndex = mapEntry.findIndex((item) => eq(item[0], k));
      if (existingIndex != -1) mapEntry.splice(existingIndex, 1);
    },
  };
}

export function computeOnChange<T>(
  callback: () => void,
  value: () => T,
  equal?: (a: T, b: T) => boolean
) {
  if (!equal) equal = (a, b) => a == b;

  const [currentValue, setCurrentValue] = createSignal<T>(value());

  callback();

  createEffect(() => {
    const v = value();
    if (!equal?.(currentValue(), v)) {
      callback();
    }
    untrack(() => setCurrentValue(() => v));
  });
}
