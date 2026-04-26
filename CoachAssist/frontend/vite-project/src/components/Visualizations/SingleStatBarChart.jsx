/*
SingleStatBarChart

Displays MULTIPLE stats across games.
Each stat becomes its own colored bar within the game group.
*/

// Import chart components from Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from "recharts";


// CoachAssist color palette for stats (fallback only)
const COLORS = [
  "#4CAF50", "#2196F3", "#FFC107", "#FF5722",
  "#9C27B0", "#00BCD4", "#8BC34A", "#FF9800",
  "#3F51B5", "#E91E63", "#795548", "#607D8B"
];

// Convert stat keys like passing_yards to Passing Yards
function formatLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function SingleStatBarChart({ data, stats, useComparisonColors = false, compareMode = "team", useClassicColors = false }) {

  /*If no stats selected, still render the chart container so the graph viewer does not disappear.*/
  if (!stats || stats.length === 0) {
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

  /*  EXPANDED COLOR SETS */
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

  return (

    <div className="chart-container">

      <ResponsiveContainer width="100%" height="100%">

        <BarChart

          data={data}

          /*  UPDATED: label cutoff fix */
          margin={{
            top: 10,
            right: 15,
            left: -3,
            bottom: 110
          }}

        >

          {/* White background improves readability */}
          <rect width="100%" height="100%" fill="white" />

          {/* Grid lines */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#ddd"
          />

          {/* X Axis */}
          <XAxis

            dataKey="game"

            interval={0}

            /*  UPDATED: less tilt + more space */
            angle={-30}

            textAnchor="end"

            dx={-10}
            tickMargin={20}

            height={110}

            tick={{
              fill: "#333",
              fontSize: 12
            }}

          />

          {/* Y Axis */}
          <YAxis

            width={35}

            stroke="#333"

            tick={{
              fill: "#333",
              fontSize: 12
            }}

            domain={[0, "dataMax + 1"]}

          />

          {/* Tooltip */}
          <Tooltip

            formatter={(value, name) => [
              value,
              formatLabel(name)
            ]}

            labelFormatter={(label) => `Game: ${label}`}

            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #ccc",
              padding: "6px 8px",
              color: "black"
            }}

            itemStyle={{ color: "black" }}
            labelStyle={{ color: "black" }}

          />

          {/* Legend */}
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{
                paddingTop: 18,
                fontSize: 13
            }}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }}>
                {value}
              </span>
            )}
          />

          {/* Bars */}
          {stats.map((stat, index) => {

            const isOpp =
              compareMode === "opponent" ||
              stat.startsWith("opp_") ||
              stat.includes("_opp");

            let color;

            if (useClassicColors) {
              // 🎨 Player-style colors
              color = COLORS[index % COLORS.length];

            } else if (useComparisonColors) {
              // 🔵🔴 Game comparison
              color = isOpp
                ? OPP_COLORS[index % OPP_COLORS.length]
                : TEAM_COLORS[index % TEAM_COLORS.length];

            } else {
              color = COLORS[index % COLORS.length];
            }

            return (
              <Bar
                key={stat}
                dataKey={stat}
                name={formatLabel(stat)}
                fill={color}
                radius={[4,4,0,0]}
                maxBarSize={45}

              />
            );

          })}

        </BarChart>

      </ResponsiveContainer>

    </div>

  );

}