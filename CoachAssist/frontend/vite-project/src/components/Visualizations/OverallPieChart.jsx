/*
This chart supports the "expanded" mode used by the ExpandableChart modal. 
When expanded is true, the outerRadius and center position increase so the pie chart fills more of the available space.

Due to how Recharts handles ResponsiveContainer and radius scaling, the visual size increase may appear smaller than expected depending on the modal layout.

Future improvement:
- Revisit modal sizing and container scaling so the
  expanded pie chart fills the screen more aggressively.
*/

// Import Recharts components for pie charts
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell
} from "recharts";

/*Color palette supporting up to 12 stat categories. Colors repeat if more stats are added.*/
const COLORS = [
  "#4CAF50",
  "#2196F3",
  "#FFC107",
  "#FF5722",
  "#9C27B0",
  "#00BCD4",
  "#8BC34A",
  "#FF9800",
  "#3F51B5",
  "#E91E63",
  "#795548",
  "#607D8B"
];

/*
Custom Legend Renderer
*/
function CustomLegend({ payload }) {

  return (

    <div
      style={{
        background: "white",
        padding: "12px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        minWidth: "180px"
      }}
    >

      <div
        style={{
          fontWeight: "bold",
          marginBottom: "8px",
          color: "black"
        }}
      >
        Stats Legend
      </div>

      {payload.map((entry, index) => (

        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "4px",
            color: "black"
          }}
        >

          <div
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: entry.color,
              marginRight: "8px"
            }}
          />

          <span>{entry.value}</span>

        </div>

      ))}

    </div>

  );
}

export default function OverallPieChart({ data, expanded, useComparisonColors = false }) {

  if (!data || data.length === 0) {
    return (
      <div
        className="chart-container"
        style={{
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <p style={{ color: "black" }}>
          Select stats to visualize
        </p>
      </div>
    );
  }

  /*Increase radius when expanded so the pie actually grows in fullscreen*/
  const radius = expanded ? 340 : 145;

  /*Move center slightly left when expanded to leave room for legend*/
  const centerX = expanded ? "40%" : "45%";

  return (

    <div className="chart-container">

      <ResponsiveContainer width="100%" height="100%">

        <PieChart>

          {/* Each slice represents a stat */}
          <Pie
            data={data}
            dataKey="value"
            nameKey="stat"
            cx={centerX}
            cy="50%"
            outerRadius={radius}
            label
          >

            {/* 🔥 UPDATED: dynamic color mapping */}
            {data.map((entry, index) => {

              const isOpp = entry.stat.includes("(Opp)");

              const TEAM_COLORS = [
                "#3b82f6", "#2563eb", "#1d4ed8",
                "#60a5fa", "#93c5fd",
                "#0ea5e9", "#0284c7", "#0369a1",
                "#38bdf8", "#7dd3fc"
              ];

              const OPP_COLORS = [
                "#ef4444", "#dc2626", "#b91c1c",
                "#f87171", "#fca5a5",
                "#fb7185", "#e11d48", "#be123c",
                "#fecaca", "#fda4af"
              ];

              const color = useComparisonColors
                ? (isOpp
                    ? OPP_COLORS[index % OPP_COLORS.length]
                    : TEAM_COLORS[index % TEAM_COLORS.length])
                : COLORS[index % COLORS.length];

              return (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                />
              );

            })}

          </Pie>

          {/* Tooltip */}
          <Tooltip
            formatter={(value, name, props) => [
              value,
              props.payload.stat
            ]}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #ccc",
              padding: "6px 8px",
              color: "black"
            }}
          />

          {/* Custom Legend Box */}
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            content={<CustomLegend />}
            wrapperStyle={{
              right: expanded ? 60 : 40
            }}
          />

        </PieChart>

      </ResponsiveContainer>

    </div>

  );
}