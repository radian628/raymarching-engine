import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  untrack,
} from "solid-js";
import { indentWithTab } from "@codemirror/commands";
import {
  linter,
  Diagnostic,
  forceLinting,
  setDiagnostics,
} from "@codemirror/lint";
import { glslSyntaxHighlighting } from "./GLSLSyntaxHighlighting";
import {
  HighlightStyle,
  syntaxHighlighting,
  codeFolding,
  foldGutter,
} from "@codemirror/language";
import { history } from "@codemirror/commands";

import { tags as t, Tag } from "@lezer/highlight";

export const customParamKey = Tag.define();
export const customParamValue = Tag.define();

console.log(Tag);

function arrayEquals<T>(a: readonly T[], b: readonly T[]) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] != b[i]) return false;
  }

  return true;
}

export function GLSLEditor(props: {
  src: () => string;
  setSrc: (s: string) => void;
  infoLog: () => string;
  onSave: () => void;
  extraErrors: () => { start: number; end: number; message: string }[];
}) {
  const [localSrc, setLocalSrc] = createSignal(props.src());

  return (
    <div
      ref={(el) => {
        const extensions = () => [
          history(),
          lineNumbers(),
          EditorView.updateListener.of(function (e) {
            batch(() => {
              const content = e.state.doc.toString();
              props.setSrc(content);
              setLocalSrc(content);
            });
          }),
          EditorView.theme({
            ".cm-content": {
              caretColor: "white",
            },
            ".cm-gutterElement": {
              background: "#00000000",
              color: "white",
            },
            ".cm-gutters": {
              borderColorRight: "#ffffff88",
              backgroundColor: "#00000000",
            },
            ".cm-tooltip": {
              background: "black",
              color: "white",
            },
          }),
          keymap.of([
            indentWithTab,
            {
              key: "Ctrl-s",
              run: (target) => {
                props.onSave();
                return true;
              },
            },
          ]),
          glslSyntaxHighlighting(),
          syntaxHighlighting(
            HighlightStyle.define([
              { tag: [t.typeName], color: "#ff4444" },
              { tag: [t.comment], color: "#999999" },
              { tag: [t.attributeName], color: "#BB77AA" },
              { tag: [t.attributeValue], color: "#FFAAFF" },
              { tag: [t.integer, t.float], color: "#00AACC" },
              { tag: [t.variableName], color: "#FFFFAA" },
              { tag: [t.operator], color: "white" },
              { tag: [t.keyword], color: "#99EE99" },
            ])
          ),
        ];

        const view = new EditorView({
          state: EditorState.create({
            doc: props.src(),
            extensions: extensions(),
          }),
          parent: el,
        });

        createEffect<
          [string, { start: number; end: number; message: string }[]]
        >(
          (prev) => {
            let diagnostics: Diagnostic[] = [];

            if (
              arrayEquals([props.infoLog(), props.extraErrors()] as const, prev)
            )
              return prev;

            props
              .infoLog()
              .split("\n")
              .map((l) => {
                const [col, line] = l
                  .slice(7)
                  .split(":")
                  .slice(0, 2)
                  .map((e) => parseInt(e));

                if (typeof line != "number" || line < 145) return;

                const lineInfo = view.state.doc.line(line - 145);

                diagnostics.push({
                  from: lineInfo.from,
                  to: lineInfo.to,
                  severity: "error",
                  message: l.slice(7).split(":").slice(2).join(":"),
                });
              });

            props.extraErrors().forEach((err) => {
              diagnostics.push({
                from: err.start,
                to: err.end,
                message: err.message,
                severity: "error",
              });
            });

            view.dispatch(setDiagnostics(view.state, diagnostics));

            return [props.infoLog(), props.extraErrors()];
          },
          ["", []]
        );

        createEffect(() => {
          untrack(() => {
            view.setState(
              EditorState.create({
                doc: props.src(),
                extensions: extensions(),
              })
            );
          });
        });

        createEffect(() => {
          if (localSrc() == props.src()) return;
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: props.src(),
            },
          });
        });
      }}
    ></div>
  );
}
