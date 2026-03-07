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

/*
SingleStatBarChart

Displays MULTIPLE stats across games.

Example data structure:

[
  {
    game: "UCLA",
    passing_yards: 250,
    rushing_yards: 80
  },
  {
    game: "USC",
    passing_yards: 310,
    rushing_yards: 65
  }
]

Each stat becomes its own colored bar within the game group.
*/

// CoachAssist color palette for stats
const COLORS = [
  "#4C6EF5", // blue
  "#8E44AD", // purple
  "#4CAF50", // green
  "#E4572E", // orange
  "#E3B505"  // gold
];

// Convert stat keys like passing_yards → Passing Yards
function formatLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function SingleStatBarChart({ data, stats }) {

  /*
  If no stats selected, still render the chart container
  so the graph viewer does not disappear.
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

  return (

    // Container controlled by CSS sizing
    <div className="chart-container">

      {/* Responsive container ensures chart fills available space */}
      <ResponsiveContainer width="100%" height="100%">

        <BarChart

          data={data}

          /*
          Margin spacing to keep axes labels readable
          and consistent with other charts.
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

          {/* Grid lines for visual reference */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#ddd"
          />

          {/* ===============================
             X Axis
             Shows game opponent names
          =============================== */}

          <XAxis

            dataKey="game"

            interval={0}

            /*
            Rotate labels so longer opponent
            names fit cleanly.
            */
            angle={-45}

            textAnchor="end"

            /*
            Horizontal adjustment
            */
            dx={-20}

            /*
            Adds spacing between axis and labels
            */
            tickMargin={30}

            height={60}

            tick={{
              fill: "#333",
              fontSize: 12
            }}

          />

          {/* ===============================
             Y Axis
             Shows stat values
          =============================== */}

          <YAxis

            width={35}

            stroke="#333"

            tick={{
              fill: "#333",
              fontSize: 12
            }}

            /*
            Automatically scales chart
            based on largest value.
            */
            domain={[0, "dataMax + 1"]}

          />

          {/* ===============================
             Tooltip
             Shows stat values when hovering
          =============================== */}

          <Tooltip

            /*
            Replace raw stat key with readable label
            */
            formatter={(value, name) => [
              value,
              formatLabel(name)
            ]}

            /*
            Display game name
            */
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

          {/* ===============================
             Legend
             Shows stat color mapping
          =============================== */}

          <Legend
            verticalAlign="bottom"
            wrapperStyle={{
                paddingTop: 18,
                fontSize: 13
            }}

            /*
            Force legend text to remain black
            while keeping colored icons.
            */
            formatter={(value) => (
                <span style={{ color: "black" }}>
                {value}
                </span>
            )}
            />

          {/* ===============================
             Bars - One bar per stat per game
          =============================== */}

          {stats.map((stat, index) => (

            <Bar

              key={stat}

              dataKey={stat}

              name={formatLabel(stat)}

              fill={COLORS[index % COLORS.length]}

              /*
              Rounded top corners
              */
              radius={[4,4,0,0]}

              /*
              Slightly narrower bars
              improves grouping visibility
              */
              maxBarSize={45}

            />

          ))}

        </BarChart>

      </ResponsiveContainer>

    </div>

  );

}