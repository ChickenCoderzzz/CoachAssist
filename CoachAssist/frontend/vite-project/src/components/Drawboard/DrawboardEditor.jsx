import { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/drawboard.css";

const VIEW_W = 1000;
const VIEW_H = 600;

const TOOLS = [
  { id: "select", label: "Select" },
  { id: "puck-o", label: "O" },
  { id: "puck-x", label: "X" },
  { id: "arrow", label: "Arrow" },
  { id: "line", label: "Line" },
  { id: "rect", label: "Rect" },
  { id: "ellipse", label: "Ellipse" },
  { id: "free", label: "Pen" },
  { id: "text", label: "Text" },
  { id: "eraser", label: "Eraser" },
];

const COLORS = ["#000000", "#ffffff", "#e63946", "#1d3557", "#ffd166", "#06d6a0"];

const newId = () => Math.random().toString(36).slice(2, 10);

function FieldBackground() {
  const yardLines = [];
  for (let i = 1; i < 10; i++) {
    const x = 100 + i * 80;
    yardLines.push(
      <line
        key={`yl-${i}`}
        x1={x}
        y1={50}
        x2={x}
        y2={550}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
      />
    );
  }
  return (
    <g pointerEvents="none">
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#3f8a3f" />
      <rect x="0" y="50" width="100" height="500" fill="#2f6a2f" />
      <rect x="900" y="50" width="100" height="500" fill="#2f6a2f" />
      <rect
        x="100"
        y="50"
        width="800"
        height="500"
        fill="none"
        stroke="white"
        strokeWidth="3"
      />
      {yardLines}
      <text x="500" y="35" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
        50
      </text>
    </g>
  );
}

function renderElement(el, opts = {}) {
  const { onPointerDown } = opts;
  const interactive = onPointerDown ? { onPointerDown: (e) => onPointerDown(e, el) } : {};
  const cursor = onPointerDown ? "pointer" : "default";

  switch (el.type) {
    case "puck": {
      const fill = el.team === "X" ? "#1d3557" : "#e63946";
      return (
        <g key={el.id} style={{ cursor }} {...interactive}>
          <circle cx={el.x} cy={el.y} r="22" fill={fill} stroke="white" strokeWidth="2" />
          <text
            x={el.x}
            y={el.y + 7}
            textAnchor="middle"
            fill="white"
            fontWeight="bold"
            fontSize="22"
            pointerEvents="none"
          >
            {el.team}
          </text>
          {el.label && (
            <text
              x={el.x}
              y={el.y + 42}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              pointerEvents="none"
            >
              {el.label}
            </text>
          )}
        </g>
      );
    }
    case "arrow": {
      if (!el.points || el.points.length < 2) return null;
      const d = el.points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`)
        .join(" ");
      const last = el.points[el.points.length - 1];
      const prev = el.points[el.points.length - 2];
      const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
      const ah = 14;
      const a1 = [
        last[0] - ah * Math.cos(angle - Math.PI / 6),
        last[1] - ah * Math.sin(angle - Math.PI / 6),
      ];
      const a2 = [
        last[0] - ah * Math.cos(angle + Math.PI / 6),
        last[1] - ah * Math.sin(angle + Math.PI / 6),
      ];
      return (
        <g key={el.id} style={{ cursor }} {...interactive}>
          <path
            d={d}
            stroke={el.color || "#000"}
            strokeWidth="3"
            fill="none"
            strokeDasharray={el.style === "dashed" ? "8 6" : undefined}
          />
          <polygon
            points={`${last[0]},${last[1]} ${a1[0]},${a1[1]} ${a2[0]},${a2[1]}`}
            fill={el.color || "#000"}
          />
        </g>
      );
    }
    case "line":
      return (
        <line
          key={el.id}
          style={{ cursor }}
          {...interactive}
          x1={el.x}
          y1={el.y}
          x2={el.x + el.w}
          y2={el.y + el.h}
          stroke={el.color || "#000"}
          strokeWidth="3"
        />
      );
    case "rect":
      return (
        <rect
          key={el.id}
          style={{ cursor }}
          {...interactive}
          x={Math.min(el.x, el.x + el.w)}
          y={Math.min(el.y, el.y + el.h)}
          width={Math.abs(el.w)}
          height={Math.abs(el.h)}
          fill="none"
          stroke={el.color || "#000"}
          strokeWidth="3"
        />
      );
    case "ellipse":
      return (
        <ellipse
          key={el.id}
          style={{ cursor }}
          {...interactive}
          cx={el.x + el.w / 2}
          cy={el.y + el.h / 2}
          rx={Math.abs(el.w / 2)}
          ry={Math.abs(el.h / 2)}
          fill="none"
          stroke={el.color || "#000"}
          strokeWidth="3"
        />
      );
    case "free": {
      if (!el.points || el.points.length === 0) return null;
      const d = el.points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`)
        .join(" ");
      return (
        <path
          key={el.id}
          style={{ cursor }}
          {...interactive}
          d={d}
          stroke={el.color || "#000"}
          strokeWidth={el.width || 3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    case "text":
      return (
        <text
          key={el.id}
          style={{ cursor }}
          {...interactive}
          x={el.x}
          y={el.y}
          fill={el.color || "#000"}
          fontSize={el.size || 18}
        >
          {el.text}
        </text>
      );
    default:
      return null;
  }
}

export default function DrawboardEditor({
  initialSnapshot,
  readOnly = false,
  transparentBg = false,
  onSave,
  height = 600,
}) {
  const [bg, setBg] = useState(initialSnapshot?.bg || (transparentBg ? "blank" : "field"));
  const [elements, setElements] = useState(initialSnapshot?.elements || []);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#000000");
  const [arrowStyle, setArrowStyle] = useState("solid");
  const [drafting, setDrafting] = useState(null); // in-progress shape
  const [history, setHistory] = useState([]); // undo stack
  const [redoStack, setRedoStack] = useState([]);
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const svgRef = useRef(null);

  // Reload when initialSnapshot changes (e.g. version preview).
  useEffect(() => {
    setBg(initialSnapshot?.bg || (transparentBg ? "blank" : "field"));
    setElements(initialSnapshot?.elements || []);
    setHistory([]);
    setRedoStack([]);
  }, [initialSnapshot, transparentBg]);

  const pushHistory = (prevElements) => {
    setHistory((h) => [...h.slice(-49), prevElements]);
    setRedoStack([]);
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setRedoStack((r) => [...r, elements]);
      setElements(prev);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      setHistory((h) => [...h, elements]);
      setElements(next);
      return r.slice(0, -1);
    });
  };

  const screenToSvg = (e) => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const loc = pt.matrixTransform(ctm.inverse());
    return [loc.x, loc.y];
  };

  const handlePointerDown = (e) => {
    if (readOnly) return;
    if (tool === "select" || tool === "eraser") return;
    e.preventDefault();
    const [x, y] = screenToSvg(e);

    if (tool === "puck-o" || tool === "puck-x") {
      pushHistory(elements);
      setElements([
        ...elements,
        { id: newId(), type: "puck", team: tool === "puck-o" ? "O" : "X", x, y },
      ]);
      return;
    }

    if (tool === "text") {
      const text = window.prompt("Text:");
      if (!text) return;
      pushHistory(elements);
      setElements([
        ...elements,
        { id: newId(), type: "text", x, y, text, color, size: 18 },
      ]);
      return;
    }

    if (tool === "arrow" || tool === "free") {
      setDrafting({ id: newId(), type: tool === "arrow" ? "arrow" : "free", points: [[x, y]], color, style: arrowStyle, width: 3 });
      return;
    }

    // line / rect / ellipse
    setDrafting({ id: newId(), type: tool, x, y, w: 0, h: 0, color });
  };

  const handlePointerMove = (e) => {
    if (!drafting) return;
    const [x, y] = screenToSvg(e);
    if (drafting.type === "arrow" || drafting.type === "free") {
      setDrafting({ ...drafting, points: [...drafting.points, [x, y]] });
    } else {
      setDrafting({ ...drafting, w: x - drafting.x, h: y - drafting.y });
    }
  };

  const handlePointerUp = () => {
    if (!drafting) return;
    pushHistory(elements);
    setElements([...elements, drafting]);
    setDrafting(null);
  };

  const handleElementClick = (e, el) => {
    if (readOnly) return;
    if (tool === "eraser") {
      e.stopPropagation();
      pushHistory(elements);
      setElements(elements.filter((x) => x.id !== el.id));
    }
  };

  const clear = () => {
    if (elements.length === 0) return;
    if (!window.confirm("Clear the entire board?")) return;
    pushHistory(elements);
    setElements([]);
  };

  const handleSave = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    try {
      await onSave({ bg, elements }, summary || null);
      setSummary("");
    } finally {
      setSaving(false);
    }
  };

  const showField = bg === "field";
  const renderedElements = useMemo(
    () => elements.map((el) => renderElement(el, { onPointerDown: handleElementClick })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [elements, tool, readOnly]
  );

  return (
    <div className="drawboard">
      {!readOnly && (
        <div className="drawboard-toolbar">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`db-tool ${tool === t.id ? "active" : ""}`}
              onClick={() => setTool(t.id)}
              type="button"
            >
              {t.label}
            </button>
          ))}

          <span className="db-sep" />

          <select
            value={arrowStyle}
            onChange={(e) => setArrowStyle(e.target.value)}
            title="Arrow style"
          >
            <option value="solid">Arrow: solid</option>
            <option value="dashed">Arrow: dashed</option>
          </select>

          <span className="db-sep" />

          {COLORS.map((c) => (
            <button
              key={c}
              className={`db-color ${color === c ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              type="button"
              aria-label={`color ${c}`}
            />
          ))}

          <span className="db-sep" />

          <button className="db-tool" onClick={undo} type="button" disabled={!history.length}>
            Undo
          </button>
          <button className="db-tool" onClick={redo} type="button" disabled={!redoStack.length}>
            Redo
          </button>

          {!transparentBg && (
            <button
              className="db-tool"
              onClick={() => setBg(bg === "field" ? "blank" : "field")}
              type="button"
            >
              {showField ? "Blank bg" : "Field bg"}
            </button>
          )}

          <button className="db-tool db-danger" onClick={clear} type="button">
            Clear
          </button>
        </div>
      )}

      <div
        className={`drawboard-canvas ${transparentBg ? "transparent" : ""}`}
        style={{ height }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            width: "100%",
            height: "100%",
            cursor: readOnly ? "default" : tool === "select" ? "default" : "crosshair",
            touchAction: "none",
            background: transparentBg ? "transparent" : "#fff",
          }}
        >
          {showField && !transparentBg && <FieldBackground />}
          {renderedElements}
          {drafting && renderElement(drafting)}
        </svg>
      </div>

      {!readOnly && onSave && (
        <div className="drawboard-savebar">
          <input
            type="text"
            placeholder="Summary of this change (optional)"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <button className="db-save" onClick={handleSave} disabled={saving} type="button">
            {saving ? "Saving…" : "Save version"}
          </button>
        </div>
      )}
    </div>
  );
}
