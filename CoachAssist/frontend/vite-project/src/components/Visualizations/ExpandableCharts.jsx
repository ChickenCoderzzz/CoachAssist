import { useState } from "react";

/*
ExpandableChart

Allows any chart to expand into fullscreen.

Supports two usage styles:

1) Normal charts
<ExpandableChart>
  <BarChartComponent />
</ExpandableChart>

2) Charts that need the expanded flag
<ExpandableChart
  render={(expanded) => (
    <PieChartComponent expanded={expanded} />
  )}
/>

*/

export default function ExpandableChart({ children, render }) {

  const [expanded, setExpanded] = useState(false);

  const content = render ? render(false) : children;
  const expandedContent = render ? render(true) : children;

  return (
    <>

      {/* ================= NORMAL VIEW ================= */}

      <div style={{ position: "relative" }}>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(true)}
          style={{
            position: "absolute",
            right: "8px",
            top: "8px",
            zIndex: 5,
            padding: "4px 10px",
            fontSize: "12px",
            cursor: "pointer"
          }}
        >
          Expand
        </button>

        {content}

      </div>


      {/* ================= EXPANDED VIEW ================= */}

      {expanded && (

        <div
          onClick={() => setExpanded(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,

            width: "100vw",
            height: "100vh",

            background: "rgba(0,0,0,0.85)",

            display: "flex",
            justifyContent: "center",
            alignItems: "center",

            zIndex: 2000
          }}
        >

          <div
            className="expanded-chart"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90vw",
              height: "90vh",
              position: "relative",
              display: "flex"
            }}
          >

            {/* Close button */}
            <button
              onClick={() => setExpanded(false)}
              style={{
                position: "absolute",
                top: "-40px",
                right: "0",
                padding: "6px 12px",
                cursor: "pointer"
              }}
            >
              Close
            </button>


            {/* Override chart container size ONLY when expanded */}
            <style>
              {`
                .expanded-chart .chart-container {
                  width: 100% !important;
                  height: 100% !important;
                }
              `}
            </style>


            {/* Chart area */}
            <div style={{ flex: 1 }}>
              {expandedContent}
            </div>

          </div>

        </div>

      )}

    </>
  );
}