import { StreamLanguage, StreamParser } from "@codemirror/language";
import { tags as t, Tag } from "@lezer/highlight";

export function glslSyntaxHighlighting() {
  const parser: StreamParser<{
    comment: false | "block" | "line";
    precedingDocComment: 0 | 1 | 2;
  }> = {
    name: "glsl",
    token(stream, state) {
      const checkEndOfLineComment = () => {
        if (stream.eol() && state.comment == "line") {
          state.comment = false;
        }
      };

      if (state.comment) {
        if (stream.match(/^@\w+/)) {
          state.precedingDocComment = 1;
          checkEndOfLineComment();
          return "attributeName";
        }

        if (state.precedingDocComment == 1) {
          stream.eatSpace();
          checkEndOfLineComment();
          if (!stream.match("=")) {
            state.precedingDocComment = 0;
            checkEndOfLineComment();
            return "comment";
          }
          stream.eatSpace();
          checkEndOfLineComment();
          state.precedingDocComment = 2;
          checkEndOfLineComment();
          return "comment";
        }

        if (state.precedingDocComment == 2) {
          if (stream.match(/"[^"]*?"|\S+/)) {
            state.precedingDocComment = 0;
            checkEndOfLineComment();
            return "attributeValue";
          }
        }

        state.precedingDocComment = 0;
      }

      // handle comments
      if (stream.match(/^\/\*/)) {
        state.comment = "block";
        return "comment";
      }
      if (stream.match(/^\/\//)) {
        state.comment = "line";
        checkEndOfLineComment();
        return "comment";
      }
      if (stream.match(/^\*\//) && state.comment == "block") {
        state.comment = false;
        return "comment";
      }
      if (state.comment) {
        stream.next();
        checkEndOfLineComment();
        return "comment";
      }

      // handle whitespace
      stream.eatSpace();

      // handle type names
      if (
        stream.match(/^[iu]?vec[234]/) ||
        stream.match(/^(int|uint|float)/) ||
        stream.match(/^sampler[1D|2D|3D]/)
      )
        return "typeName";

      // handle keywords
      if (
        stream.match(/^(for|return|while|switch|break|uniform|struct|if|else)/)
      )
        return "keyword";

      // handle identifiers
      if (stream.match(/^[a-zA-Z_][a-zA-Z_0-9]*/)) return "variableName";

      // handle numbers
      if (stream.match(/^-?[1-9][0-9]*/)) return "integer";
      if (stream.match(/^-?[0-9]*\.[0-9]*/)) return "float";

      // handle operators
      if (stream.match(/^(\-|\+|\*|\/|\%|\>|\<|\>\=|\<\=|\=|\=\=)/))
        return "operator";

      stream.next();
      return "name";
    },
    startState: (indentUnit) => {
      return { comment: false, precedingDocComment: 0 };
    },
  };

  return StreamLanguage.define(parser);
}
