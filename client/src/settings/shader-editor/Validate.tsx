import { parser } from "@shaderfrog/glsl-parser";

function findGlobalScope(ast: any): any {
  return ast.scopes.find((e: any) => e.name == "global");
}

const defaultFunctionsCache = new Map<string, string>();
export function addDefaultFunctionsToShaderCode(src: string): string {
  let newsrc = src;

  if (defaultFunctionsCache.has(src))
    return defaultFunctionsCache.get(src) as string;

  try {
    const ast = parser.parse(src);
    const globalScope = findGlobalScope(ast);

    if (!globalScope.functions.sceneDiffuseColor)
      newsrc += `vec3 sceneDiffuseColor(vec3 position) {
      if (length(position) > 35.0) return vec3(0.0);
      return vec3(0.6);
    }`;
    if (!globalScope.functions.sceneSpecularColor)
      newsrc += `vec3 sceneSpecularColor(vec3 position) {
      if (length(position) > 35.0) return vec3(0.0);
      return vec3(0.6);
    }`;
    if (!globalScope.functions.sceneSpecularRoughness)
      newsrc += `float sceneSpecularRoughness(vec3 position) {
      return 0.2;
    }`;
    if (!globalScope.functions.sceneSubsurfaceScattering)
      newsrc += `float sceneSubsurfaceScattering(vec3 position) {
      return 11111115.0;
    }`;
    if (!globalScope.functions.sceneSubsurfaceScatteringColor)
      newsrc += `vec3 sceneSubsurfaceScatteringColor(vec3 position) {
      if (length(position) > 30.0) return vec3(1.0);
      return vec3(1.0);
    }
    `;
    if (!globalScope.functions.sceneIOR)
      newsrc += `float sceneIOR(vec3 position) {
      return 100.0;
    }`;
    if (!globalScope.functions.sceneEmission)
      newsrc += `vec3 sceneEmission(vec3 position) {
      float d = max(normalize(position).y, 0.2);
      vec3 brightColor = vec3(0.7, 0.8, 1.0) * d * 1.0;
      return (length(position) > 36.0) ? (brightColor * 2.00) : vec3(0.0);
    }`;
    defaultFunctionsCache.set(src, newsrc);
    return newsrc;
  } catch {
    return src;
  }
}

export type CustomShaderParam = {
  type: "f" | "i" | "ui";
  quantity: 1 | 2 | 3 | 4;
  formats: ("numerical" | "position" | "color" | "checkbox")[];
  name: string;
  tooltip?: string;
  success: true;
  internalName: string;

  min?: number;
  max?: number;
  step?: number;
  sensitivity?: number;
  scale?: "log";
  defaultValue?: number[];
};

export type CustomShaderParamError = {
  success: false;
  reason: string;
  start: number;
  end: number;
};

const commentRegex = /\/\*[\w\W+]*?\*\/|\/\/[\w\W]*?\n/g;
export const uniformVariableRegex =
  /^(u?int|float|[iu]?vec[234])\s+[a-zA-Z_][a-zA-Z_0-9]*/g;

export function getSectionsInCommentsWithSpaces(src: string): string {
  return (
    src
      .match(commentRegex)
      ?.map((e) => {
        return e
          .replace(/^\/\//g, "")
          .replace(/^\/\*/g, "")
          .replace(/\*\/$/g, "");
      })
      .join(" ") ?? ""
  );
}

export function stripAllComments(src: string): string {
  return src.replace(commentRegex, " ");
}

// export function getCustomShaderParam(
//   src: string
// ): CustomShaderParam | CustomShaderParamError | false {
//   console.log(src);
//   const code = getSectionsInCommentsWithSpaces(src);
//   const withoutComments = stripAllComments(src);
//   const varDeclaration = withoutComments.match(uniformVariableRegex);
//   if (!varDeclaration) return false;
//   const [typename, varName] = Array.from(varDeclaration)[0]
//     .split(/\s+/g)
//     .map((e) => e.trim());

//   if (!typename || !varName) return false;
//   let quantity: 1 | 2 | 3 | 4 = 1;
//   let type: "f" | "i" | "ui" = "f";
//   if (typename[0] == "u") type = "ui";
//   if (typename[0] == "i") type = "i";

//   if (typename.match(/vec/g)) {
//     quantity = parseInt(typename[typename.length - 1]) as 2 | 3 | 4;
//   }

//   let i = 0;

//   let name = varName;
//   let internalName = varName;
//   let tooltip: string | undefined = undefined;
//   let formats: Set<CustomShaderParam["formats"][number]> = new Set([
//     "numerical",
//   ] as const);

//   let otherProperties: Pick<
//     CustomShaderParam,
//     "min" | "max" | "step" | "sensitivity"
//   > = {};

//   let scale: "log" | undefined = undefined;

//   let defaultValue = [0, 0, 0, 0];

//   while (i < code.length) {
//     const curr = code.slice(i);

//     const keyValuePairArr = curr.match(/^@\w+\s*\=\s*("[^"]*?"|\S+)/);

//     if (keyValuePairArr) {
//       const kvp = keyValuePairArr[0];

//       const [rawKey, rawValue] = kvp.split("=").map((e) => e.trim());

//       const key = rawKey.slice(1);
//       const value = rawValue[0] == '"' ? rawValue.slice(1, -1) : rawValue;

//       switch (key) {
//         case "min":
//         case "max":
//         case "step":
//         case "sensitivity":
//           const numval = Number(value);
//           if (isNaN(numval)) {
//             return {
//               success: false,
//               reason: `Expected property '${key}' to be a number.`,
//             };
//           }
//           otherProperties[key] = numval;
//           break;
//         case "scale":
//           if (value == "linear") {
//           } else if (value == "log") {
//             scale = "log";
//           }
//           break;
//         case "name":
//           name = value;
//           break;
//         case "tooltip":
//           tooltip = value;
//           break;
//         case "format":
//           formats.clear();
//           const newFormats = value.split("/");
//           for (const format of newFormats) {
//             if (
//               format == "numerical" ||
//               format == "position" ||
//               format == "color" ||
//               format == "checkbox"
//             ) {
//               formats.add(format);
//             } else {
//               return {
//                 success: false,
//                 reason: `Unknown input format '${format}'. Accepted values are "numerical", "position", "color", and "checkbox"`,
//               };
//             }
//           }
//           break;
//         case "default":
//           const defaultValues = value.split(",");
//           if (defaultValues.length != quantity)
//             return {
//               success: false,
//               reason: `This variable requires ${quantity} default values, but ${defaultValues.length} were supplied. Note that you need quotes if a value contains spaces.`,
//             };

//           defaultValue = defaultValues.map((s) => Number(s));
//           break;
//       }

//       i += kvp.length;
//     } else {
//       i++;
//     }
//   }
//   return {
//     success: true,
//     quantity,
//     type,
//     name,
//     tooltip,
//     internalName,
//     formats: Array.from(formats.values()),
//     ...otherProperties,
//     scale,
//     defaultValue,
//   };
// }

// export function getCustomShaderParams(
//   src: string
// ): (CustomShaderParam | CustomShaderParamError)[] {
//   return src
//     .split(/uniform/g)
//     .slice(1)
//     .map((str) => getCustomShaderParam(str))
//     .filter((e) => e) as (CustomShaderParam | CustomShaderParamError)[];
// }
