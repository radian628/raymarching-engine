import { streamify } from "../../util/StringStream";
import {
  CustomShaderParam,
  CustomShaderParamError,
  uniformVariableRegex,
} from "./Validate";

export function getCustomShaderParams(
  src: string
): (CustomShaderParam | CustomShaderParamError)[] {
  const stream = streamify(src);

  const customShaderParams: (CustomShaderParam | CustomShaderParamError)[] = [];

  let isInComment: false | "line" | "block" = false;

  let quantity: 1 | 2 | 3 | 4 = 1;
  let type: "f" | "i" | "ui" = "f";
  let name = "";
  let internalName = "";
  let tooltip: string | undefined = undefined;
  let formats: Set<CustomShaderParam["formats"][number]> = new Set([
    "numerical",
  ] as const);

  let otherProperties: Pick<
    CustomShaderParam,
    "min" | "max" | "step" | "sensitivity"
  > = {};

  let scale: "log" | undefined = undefined;

  let defaultValue = [0, 0, 0, 0];

  let uniformParseState: 0 | 1 = 0;

  let isFirstUniform = true;

  function addCustomShaderParam() {
    uniformParseState = 1;
    console.log("uniform got here");
    if (!isFirstUniform) {
      customShaderParams.push({
        success: true,
        quantity,
        type,
        name,
        tooltip,
        internalName,
        formats: Array.from(formats.values()),
        ...otherProperties,
        scale,
        defaultValue,
      });
      quantity = 1;
      type = "f";
      name = "";
      tooltip = undefined;
      internalName = "";
      formats = new Set(["numerical"] as const);
      otherProperties = {};
      scale = undefined;
      defaultValue = [0, 0, 0, 0];
    }
    isFirstUniform = false;
    stream.match(/^\s/);
  }

  while (!stream.done()) {
    // handle entering/exiting comments
    if (stream.match("//") && !isInComment) {
      isInComment = "line";
      console.log("linecomment");
      continue;
    }
    if (stream.match("/*") && !isInComment) {
      isInComment = "block";
      continue;
    }
    if (stream.match("*/") && isInComment == "block") {
      isInComment = false;
      continue;
    }
    if (stream.match("\n", true) && isInComment == "line") {
      isInComment = false;
      continue;
    }

    // handle stuff within comments
    if (isInComment) {
      const keyValuePairArr = stream.match(/^@\w+\s*\=\s*("[^"]*?"|\S+)/);

      console.log("kvp", keyValuePairArr);

      if (keyValuePairArr) {
        const kvp = keyValuePairArr;

        const [rawKey, rawValue] = kvp.split("=").map((e) => e.trim());

        const key = rawKey.slice(1);
        const value = rawValue[0] == '"' ? rawValue.slice(1, -1) : rawValue;

        switch (key) {
          case "min":
          case "max":
          case "step":
          case "sensitivity":
            const numval = Number(value);
            if (isNaN(numval)) {
              customShaderParams.push({
                success: false,
                reason: `Expected property '${key}' to be a number.`,
                start: stream.pos() - value.length,
                end: stream.pos(),
              });
            }
            otherProperties[key] = numval;
            break;
          case "scale":
            if (value == "linear") {
            } else if (value == "log") {
              scale = "log";
            }
            break;
          case "name":
            name = value;
            break;
          case "tooltip":
            tooltip = value;
            break;
          case "format":
            formats.clear();
            const newFormats = value.split("/");

            for (const format of newFormats) {
              if (
                format == "numerical" ||
                format == "position" ||
                format == "color" ||
                format == "checkbox"
              ) {
                formats.add(format);
              } else {
                customShaderParams.push({
                  success: false,
                  reason: `Unknown input format '${format}'. Accepted values are "numerical", "position", "color", and "checkbox"`,
                  start: stream.pos() - value.length,
                  end: stream.pos(),
                });
              }
            }
            break;
          case "default":
            const defaultValues = value.split(",");
            if (defaultValues.length != quantity)
              customShaderParams.push({
                success: false,
                reason: `This variable requires ${quantity} default values, but ${defaultValues.length} were supplied. Note that you need quotes if a value contains spaces.`,
                start: stream.pos() - value.length,
                end: stream.pos(),
              });

            defaultValue = defaultValues.map((s) => Number(s));
            break;
        }
        continue;
      }

      let char = stream.next(1);
      // handle stuff outside of comments
    } else {
      if ((uniformParseState as 0 | 1) == 1) {
        stream.match(/^\s/);
        const varDeclaration = stream.match(uniformVariableRegex);
        if (varDeclaration) {
          const [typename, varName] = varDeclaration
            .split(/\s+/g)
            .map((e) => e.trim());

          if (!typename || !varName) continue;
          quantity = 1;
          type = "f";
          if (typename[0] == "u") type = "ui";
          if (typename[0] == "i") type = "i";

          if (typename.match(/vec/g)) {
            quantity = parseInt(typename[typename.length - 1]) as 2 | 3 | 4;
          }

          name = varName;
          internalName = varName;
        } else {
          uniformParseState = 0;
        }
        continue;
      }

      if (stream.match("uniform")) {
        addCustomShaderParam();
        continue;
      }

      stream.next(1);
    }
  }
  addCustomShaderParam();

  return customShaderParams;
}
