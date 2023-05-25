const loadTextCache = new Map<string, string>();
export async function loadText(url: string) {
  let data = loadTextCache.get(url);
  if (data === undefined) {
    data = await await (await fetch(url)).text();
  }
  return data;
}
