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

/*
SingleStatLineChart

Displays the trend of MULTIPLE stats across games.

Example data:

[
  {
    game: "UCLA",
    opponent: "UCLA",
    date: "2024-09-10",
    passing_yards: 250,
    rushing_yards: 75
  }
]

Each stat appears as its own line.
*/

// CoachAssist color palette
const COLORS = [
  "#4C6EF5", // blue
  "#8E44AD", // purple
  "#4CAF50", // green
  "#E4572E", // orange
  "#E3B505"  // gold
];

// Convert stat keys to readable labels
function formatLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function SingleStatLineChart({ data, stats }) {

  /*
  =====================================
  If no stats selected

  Show message instead of hiding viewer
  =====================================
  */

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
  =====================================
  Custom Tooltip

  Displays:
  - Opponent
  - Date
  - All stat values for that game
  =====================================
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

          {/* Display each stat value */}
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


  return (

    // Container controlled by CSS sizing
    <div className="chart-container">

      {/* Responsive container ensures chart fills available space */}
      <ResponsiveContainer width="100%" height="100%">

        <LineChart

          data={data}

          /*
          Same margin configuration used
          in the grouped bar charts
          */
          margin={{
            top: 10,
            right: 15,
            left: -3,
            bottom: 40
          }}

        >

          {/* White background improves readability */}
          <rect width="100%" height="100%" fill="white" />

          {/* Grid lines improve readability */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#ddd"
          />

          {/* ===============================
             X Axis (games)
          =============================== */}

          <XAxis

            dataKey="game"

            interval={0}

            angle={-45}

            textAnchor="end"

            dx={-20}

            tickMargin={30}

            height={60}

            tick={{
              fill: "#333",
              fontSize: 12
            }}

          />

          {/* ===============================
             Y Axis (stat values)
          =============================== */}

          <YAxis

            width={35}

            stroke="#333"

            tick={{
              fill: "#333",
              fontSize: 12
            }}

            domain={[0, "dataMax + 1"]}

          />

          {/* ===============================
             Tooltip
          =============================== */}

          <Tooltip content={<CustomTooltip />} />

          {/* ===============================
             Legend
          =============================== */}

          <Legend
            verticalAlign="bottom"
            wrapperStyle={{
                paddingTop: 18,
                fontSize: 13
            }}
            formatter={(value) => (
                <span style={{ color: "black" }}>
                {value}
                </span>
            )}
            />

          {/* ===============================
             Render one line per stat
          =============================== */}

          {stats.map((stat, index) => (

            <Line

              key={stat}

              type="monotone"

              dataKey={stat}

              name={formatLabel(stat)}

              stroke={COLORS[index % COLORS.length]}

              strokeWidth={3}

              dot={{
                r: 4,
                fill: COLORS[index % COLORS.length]
              }}

              activeDot={{
                r: 6
              }}

            />

          ))}

        </LineChart>

      </ResponsiveContainer>

    </div>

  );

}