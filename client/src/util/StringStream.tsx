export interface StringStream {
  match: (
    pattern: string | RegExp | ((input: string) => number),
    noConsume?: boolean
  ) => string | undefined;
  done: () => boolean;
  pos: () => number;
  next: (amount: number) => string;
}

export function streamify(str: string): StringStream {
  let pos = 0;
  return {
    done: () => pos >= str.length,
    pos: () => pos,
    match: (pattern, noConsume) => {
      if (pattern instanceof RegExp) {
        const match = str.slice(pos).match(pattern)?.[0];
        if (match) {
          if (!noConsume) pos += match.length;
          return match;
        }
      } else if (pattern instanceof Function) {
        const count = pattern(str.slice(pos));
        const match = str.slice(pos, pos + count);
        if (!noConsume) pos += count;
        return match;
      } else {
        if (str.slice(pos).startsWith(pattern)) {
          if (!noConsume) pos += pattern.length;
          return pattern;
        }
      }
    },
    next: (x) => {
      pos += x;
      return str.slice(pos - x, pos);
    },
  };
}
