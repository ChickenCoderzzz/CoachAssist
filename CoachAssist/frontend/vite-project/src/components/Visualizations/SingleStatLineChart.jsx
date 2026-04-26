/*
SingleStatLineChart

Displays the trend of MULTIPLE stats across games.
Each stat appears as its own line.
*/

// Import chart components from Recharts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from "recharts";

// CoachAssist color palette (fallback)
const COLORS = [
  "#4CAF50", "#2196F3", "#FFC107", "#FF5722",
  "#9C27B0", "#00BCD4", "#8BC34A", "#FF9800",
  "#3F51B5", "#E91E63", "#795548", "#607D8B"
];

// Convert stat keys to readable labels
function formatLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function SingleStatLineChart({ data, stats, useComparisonColors = false, compareMode="team", useClassicColors= false }) {

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

  /*
  Custom Tooltip
  */
  function CustomTooltip({ active, payload }) {

    if (active && payload && payload.length) {

      const point = payload[0].payload;

      return (

        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #ccc",
            padding: "6px 8px",
            color: "black"
          }}
        >

          <div>
            <strong>Opponent:</strong> {point.opponent || point.game}
          </div>

          <div>
            <strong>Date:</strong> {point.date || "Unknown"}
          </div>

          <hr style={{ margin: "4px 0" }} />

          {payload.map((entry, index) => (

            <div key={index}>
              <strong>{formatLabel(entry.dataKey)}:</strong> {entry.value}
            </div>

          ))}

        </div>

      );

    }

    return null;
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

        <LineChart

          data={data}

          /*  UPDATED: label cutoff fix */
          margin={{
            top: 10,
            right: 15,
            left: -3,
            bottom: 110
          }}

        >

          <rect width="100%" height="100%" fill="white" />

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#ddd"
          />

          <XAxis

            dataKey="game"

            interval={0}

            /*  UPDATED */
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

          <YAxis

            width={35}

            stroke="#333"

            tick={{
              fill: "#333",
              fontSize: 12
            }}

            domain={[0, "dataMax + 1"]}

          />

          <Tooltip content={<CustomTooltip />} />

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

          {/* Lines */}
          {stats.map((stat, index) => {

           const isOpp =
            compareMode === "opponent" ||
            stat.startsWith("opp_") ||
            stat.includes("_opp");

          let color;

          if (useClassicColors) {
            //  Player-style colors
            color = COLORS[index % COLORS.length];

          } else if (useComparisonColors) {
            //  Game comparison
            color = isOpp
              ? OPP_COLORS[index % OPP_COLORS.length]
              : TEAM_COLORS[index % TEAM_COLORS.length];

          } else {
            color = COLORS[index % COLORS.length];
          }

            return (

              <Line
                key={stat}
                type="monotone"
                dataKey={stat}
                name={formatLabel(stat)}
                stroke={color}
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: color
                }}

                activeDot={{
                  r: 6
                }}

              />
            );
          })}

        </LineChart>

      </ResponsiveContainer>

    </div>

  );

}