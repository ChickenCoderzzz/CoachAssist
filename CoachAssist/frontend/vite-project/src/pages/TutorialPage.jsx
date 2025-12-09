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
        <p>
          Welcome to the CoachAssist tutorial. This section provides an overview
          of the core features you'll use throughout the platform:
        </p>

        <ul>
          <li>Creating and managing teams</li>
          <li>Adding games, film, and related data</li>
          <li>Navigating the dashboard and analytics tools</li>
          <li>Updating your account and profile settings</li>
          <li>Using CoachAssist features to organize and review game insights</li>
        </ul>

        <p>
          Additional guided steps, examples, and walkthroughs can be added here
          as the platform evolves.
        </p>
      </div>
    </div>
  );
}
