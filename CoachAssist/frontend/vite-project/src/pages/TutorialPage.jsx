import React from "react";

export default function TutorialPage() {
  return (
    <div
      style={{
        paddingTop: "110px",
        paddingLeft: "40px",
        paddingRight: "40px",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>Tutorial</h1>

      <div
        style={{
          border: "3px solid black",
          borderRadius: "12px",
          padding: "25px",
          maxWidth: "900px",
        }}
      >
        <p>This is the tutorial page. Your teammate can fill this in later with:</p>

        <ul>
          <li>How to create a team</li>
          <li>How to add games and film</li>
          <li>How to navigate the dashboard</li>
          <li>How to manage your account</li>
          <li>How to use CoachAssist tools</li>
        </ul>

        <p>
          This page is intentionally simple so your teammate can expand it with real
          content later.
        </p>
      </div>
    </div>
  );
}
