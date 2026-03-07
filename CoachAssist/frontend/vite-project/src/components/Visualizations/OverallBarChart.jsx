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
  LabelList
} from "recharts";

export default function OverallBarChart({ data }) {

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

          /*Tight margins so the chart fills the white container more evenly.*/
          margin={{
            top: 10,
            right: 15,
            left: -3,   // pulls chart slightly left to remove empty space
            bottom: 40
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

            /*Rotate labels slightly so longer stats fit*/
            angle={-45}

            textAnchor="end"

            dx = {-20}
            tickMargin={30}

            height={60}

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