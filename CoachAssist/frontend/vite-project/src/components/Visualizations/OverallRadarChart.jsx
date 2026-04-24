/*
================================
OverallRadarChart
================================
*/

import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip
} from "recharts";

export default function OverallRadarChart({ data, expanded, useComparisonColors = false }) {

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

  /* 🔥 SPLIT TEAM / OPP DATA (ONLY WHEN ENABLED) */
  const teamData = useComparisonColors
    ? data.filter(d => !d.stat.includes("(Opp)"))
    : data;

  const oppData = useComparisonColors
    ? data.filter(d => d.stat.includes("(Opp)"))
    : [];

  /* TOOLTIP */
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      const raw = point.rawValue ?? point.value;
      const score = Math.round(point.value);
      const stat = point.stat;
      const method = point.normalizationType;

      return (
        <div
          style={{
            background: "white",
            border: "1px solid #ccc",
            padding: "6px 8px",
            color: "black"
          }}
        >
          <div>{stat}: {raw}</div>
          <div>Standardized Score: {score}</div>

          <div
            style={{
              fontSize: "11px",
              marginTop: "4px",
              color: "#555"
            }}
          >
            Based on: {method}
          </div>
        </div>
      );
    }
    return null;
  };

  /* LABEL RENDERING (UNCHANGED) */
  const renderLabel = ({ payload, x, y, textAnchor }) => {

    const sideOffset = expanded ? 18 : 10;
    const verticalOffset = expanded ? 26 : 18;

    let newX = x;
    let newY = y;

    if (textAnchor === "start") newX += sideOffset;
    else if (textAnchor === "end") newX -= sideOffset;
    else {
      if (y < 200) newY -= verticalOffset;
      else newY += verticalOffset;
    }

    const statData = data.find(d => d.stat === payload.value);

    let color = "#ffffff";

    if (statData?.normalizationType === "Per Snap") {
      color = "#22c55e";
    }

    if (statData?.normalizationType === "Ceiling") {
      color = "#facc15";
    }

    return (
      <text
        x={newX}
        y={newY}
        textAnchor={textAnchor}
        fill={color}
        fontSize={expanded ? 16 : 14}
      >
        {payload.value}
      </text>
    );
  };

  /* SIZE */
  const chartWidth = expanded ? "900px" : "650px";
  const chartHeight = expanded ? "750px" : "550px";

  return (

    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >

      <div
        style={{
          width: chartWidth,
          height: chartHeight,
          background: "#0f172a",
          borderRadius: "10px",
          padding: "10px"
        }}
      >

        <ResponsiveContainer width="100%" height="100%">

          <RadarChart
            outerRadius={expanded ? "80%" : "70%"}
            margin={{ top: 40, right: 80, left: 80, bottom: 40 }}
          >

            <PolarGrid stroke="#94a3b8" strokeOpacity={0.4} />

            <PolarAngleAxis
              dataKey="stat"
              tick={renderLabel}
            />

            <PolarRadiusAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              angle={90}
              tick={{
                fill: "#ffffff",
                fontSize: expanded ? 14 : 12
              }}
              axisLine={false}
            />

            {/* 🔥 TEAM RADAR */}
            <Radar
              data={teamData}
              dataKey="value"
              stroke={useComparisonColors ? "#3b82f6" : "#22c55e"}
              strokeWidth={3}
              fill={useComparisonColors ? "#3b82f6" : "#22c55e"}
              fillOpacity={0.25}
              dot={{
                r: expanded ? 6 : 4,
                fill: useComparisonColors ? "#3b82f6" : "#22c55e"
              }}
            />

            {/* 🔥 OPPONENT RADAR */}
            {useComparisonColors && oppData.length > 0 && (
              <Radar
                data={oppData}
                dataKey="value"
                stroke="#ef4444"
                strokeWidth={3}
                fill="#ef4444"
                fillOpacity={0.25}
                dot={{
                  r: expanded ? 6 : 4,
                  fill: "#ef4444"
                }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

          </RadarChart>

        </ResponsiveContainer>

      </div>

      {/* LEGEND (UNCHANGED) */}
      <div
        style={{
          marginTop: "-30px",
          background: "#111827",
          color: "white",
          border: "1px solid #374151",
          padding: expanded ? "14px 20px" : "10px 16px",
          borderRadius: "6px",
          fontSize: expanded ? "14px" : "13px",
          lineHeight: "1.6",
          textAlign: "left"
        }}
      >

        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Normalization Legend
        </div>

        <div>
          <span style={{ color: "#22c55e", fontWeight: "bold" }}>
            ● Per Snap
          </span>
          {" "}– Normalized by playtime
        </div>

        <div>
          <span style={{ color: "#facc15", fontWeight: "bold" }}>
            ● Ceiling
          </span>
          {" "}– Normalized by expected max
        </div>

      </div>

    </div>

  );

}