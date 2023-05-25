import { children, createContext, createSignal, useContext } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";

export type TooltipInfoType = {
  name: string | JSX.Element | JSX.Element[];
  tooltip: string | JSX.Element | JSX.Element[];
  visible: boolean;
  x: number;
  y: number;
};

export const TooltipInfo = createContext<
  [() => TooltipInfoType, (info: TooltipInfoType) => void]
>([
  () => {
    return {
      name: "Name",
      tooltip: "Tooltip",
      visible: false,
      x: 0,
      y: 0,
    };
  },
  (info: TooltipInfoType) => {},
]);

export function Named(props: {
  name: string | JSX.Element | JSX.Element[];
  tooltip?: string | JSX.Element | JSX.Element[];
  children: string | JSX.Element | JSX.Element[];
  vertical?: boolean;
}) {
  const c = children(() => props.children);
  const name = children(() => props.name);
  const tooltip = children(() => props.tooltip);
  const [isHovering, setIsHovering] = createSignal(false);

  const [tooltipInfo, setTooltipInfo] = useContext(TooltipInfo);

  return (
    <div
      class={props.vertical ? "named-input-vertical" : "named-input"}
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipInfo({
          name: name(),
          tooltip: tooltip(),
          visible: true,
          x: rect.right,
          y: rect.top,
        });
        setIsHovering(true);
      }}
      onMouseLeave={() => {
        setTooltipInfo({ name: "", tooltip: "", visible: false, x: 0, y: 0 });
        setIsHovering(false);
      }}
    >
      <label>{name()}</label>
      {c()}
      {/* {isHovering() && props.tooltip && (
        <div class="tooltip">
          <h2>{name()}</h2>
          {tooltip()}
        </div>
      )} */}
    </div>
  );
}

export function Collapsible(props: {
  name: string;
  children: string | JSX.Element | JSX.Element[];
  startOpen?: boolean;
}) {
  const c = children(() => props.children);
  const [isOpen, setIsOpen] = createSignal(props.startOpen ?? false);

  return (
    <div class="collapsible">
      {!isOpen() ? (
        <div
          class="collapsible-header"
          onClick={(e) => {
            setIsOpen(true);
            console.log("got here");
          }}
        >
          <h2>⮞ {props.name}</h2>
        </div>
      ) : (
        <div>
          <div
            class="collapsible-header"
            onClick={(e) => {
              setIsOpen(false);
              console.log("got here");
            }}
          >
            <h2>⮟ {props.name}</h2>
          </div>
          {c()}
        </div>
      )}
    </div>
  );
}
