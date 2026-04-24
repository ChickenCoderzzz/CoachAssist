/* 
OverallBarChart

Displays the total distribution of selected stats.
Each bar represents the total value of a stat across the selected games.
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
  LabelList,
  Cell   // 🔥 ADDED
} from "recharts";

export default function OverallBarChart({ data, useComparisonColors = false }) { // 🔥 ADDED PROP

/*If no stats are selected, show a message instead of rendering an empty chart.*/
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

  return (

    // Container controlled by CSS sizing
    <div className="chart-container">

      {/* Responsive container ensures chart fills available space */}
      <ResponsiveContainer width="100%" height="100%">

        <BarChart

          data={data}

          /* 🔥 UPDATED: more bottom space for labels */
          margin={{
            top: 10,
            right: 15,
            left: -3,
            bottom: 110
          }}

        >

          {/* White chart background */}
          <rect width="100%" height="100%" fill="white" />

          {/* Grid lines improve readability */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#ddd"
          />

          {/* X Axis displays stat names */}
          <XAxis

            dataKey="stat"

            interval={0}

            /* 🔥 UPDATED: less aggressive rotation */
            angle={-30}

            textAnchor="end"

            dx = {-10}   // 🔥 adjusted
            tickMargin={20}  // 🔥 adjusted

            height={110}  // 🔥 critical fix

            tick={{
              fill: "#333",
              fontSize: 12
            }}

          />

          {/* Y Axis displays stat totals */}
          <YAxis

            /*Reduce reserved width to remove left whitespace*/
            width={35}

            stroke="#333"

            tick={{
              fill: "#333",
              fontSize: 12
            }}

            /*Automatically scale based on data*/
            domain={[0, "dataMax + 1"]}

          />

          {/* Tooltip */}
          <Tooltip

            formatter={(value, name, props) => [
              value,
              props.payload.stat
            ]}

            labelFormatter={() => ""}

            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #ccc",
              padding: "6px 8px",
              color: "black"
            }}

            itemStyle={{ color: "black" }}
            labelStyle={{ color: "black" }}

          />

          {/* Main bar visualization */}
          <Bar

            dataKey="value"

            fill="#4CAF50"

            maxBarSize={50}

            radius={[4,4,0,0]}

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
                : "#4CAF50";

              return (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                />
              );

            })}

            {/* Value labels above bars */}
            <LabelList
              dataKey="value"
              position="top"
              style={{
                fill: "#333",
                fontSize: 12
              }}
            />

          </Bar>

        </BarChart>

      </ResponsiveContainer>

    </div>

  );

}