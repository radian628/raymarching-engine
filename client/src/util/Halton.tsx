export function* halton(b: number): Generator<number, number, unknown> {
  let n = 0;
  let d = 1;
  while (true) {
    let x = d - n;
    if (x == 1) {
      n = 1;
      d *= b;
    } else {
      let y = d;
      while (x <= y) {
        y /= b;
      }
      n = (b + 1) * y - x;
    }
    yield n / d;
  }
  return 0;
}
