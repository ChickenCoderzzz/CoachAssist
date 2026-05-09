// Tutorial registry — each entry pairs a route matcher with a Joyride step list.
// Adding a tour for a new page = add an entry here and a `tutorial-*` className
// somewhere on that page.

const TUTORIALS = [
  {
    label: "Dashboard tour",
    key: "coachassist_tutorial_dashboard_seen",
    matches: (path) => path === "/dashboard",
    steps: [
      {
        target: ".tutorial-dashboard-title",
        title: "Dashboard",
        content: "This is your main hub for managing teams.",
      },
      {
        target: ".tutorial-add-team-btn",
        title: "Create Team",
        content: "Start by creating a team here.",
      },
    ],
  },
  {
    label: "Profile tour",
    key: "coachassist_tutorial_profile_seen",
    matches: (path) => path === "/profile",
    steps: [
      {
        target: ".tutorial-profile-title",
        title: "Your Profile",
        content: "View your account info and access account actions like editing your profile or signing out.",
      },
    ],
  },
  {
    label: "Edit Profile tour",
    key: "coachassist_tutorial_edit_profile_seen",
    matches: (path) => path === "/edit-profile",
    steps: [
      {
        target: ".tutorial-edit-profile-title",
        title: "Edit Profile",
        content: "Update your username, email, and password here. Save your changes when you're done.",
      },
    ],
  },
  {
    label: "Team page tour",
    key: "coachassist_tutorial_team_seen",
    matches: (path) => /^\/team\/[^/]+$/.test(path),
    steps: [
      {
        target: ".tutorial-team-title",
        title: "Team Workspace",
        content: "This page is your team hub for games, roster, and history.",
      },
      {
        target: ".tutorial-add-game-btn",
        title: "Add Game",
        content: "Create a new game entry here before analyzing film and stats.",
      },
      {
        target: ".tutorial-edit-roster-btn",
        title: "Manage Roster",
        content: "Open roster management to add/edit players and review player history.",
      },
    ],
  },
  {
    label: "Roster tour",
    key: "coachassist_tutorial_roster_seen",
    matches: (path) => /^\/teams\/[^/]+\/roster$/.test(path),
    steps: [
      {
        target: ".tutorial-roster-title",
        title: "Roster",
        content: "Manage every player on your team here — add new players, edit positions, and review history.",
      },
    ],
  },
  {
    label: "Game History tour",
    key: "coachassist_tutorial_history_seen",
    matches: (path) => /^\/team\/[^/]+\/history$/.test(path),
    steps: [
      {
        target: ".tutorial-history-title",
        title: "Game History",
        content: "See every game you've recorded for this team, with scores and quick links into the analysis.",
      },
    ],
  },
  {
    label: "Analyze Game tour",
    key: "coachassist_tutorial_analyze_seen",
    matches: (path) => /^\/team\/[^/]+\/match\/[^/]+$/.test(path),
    steps: [
      {
        target: ".tutorial-analyze-title",
        title: "Analyze Game",
        content: "This page is where you review game state and player tables.",
      },
      {
        target: ".tutorial-export-btn",
        title: "Export PDF",
        content: "Use this button to export the current player unit table as a PDF.",
      },
    ],
  },
  {
    label: "Player Analysis tour",
    key: "coachassist_tutorial_player_analysis_seen",
    matches: (path) => /^\/team\/[^/]+\/analysis$/.test(path),
    steps: [
      {
        target: ".tutorial-player-analysis-title",
        title: "Player Analysis",
        content: "Drill into individual players: trends across games, comparisons, and AI-generated insights.",
      },
    ],
  },
  {
    label: "Calendar tour",
    key: "coachassist_tutorial_calendar_seen",
    matches: (path) => /^\/team\/[^/]+\/calendar$/.test(path),
    steps: [
      {
        target: ".tutorial-calendar-title",
        title: "Team Calendar",
        content: "Schedule practices, games, and team events. Click any day to add an entry.",
      },
    ],
  },
  {
    label: "Playbook tour",
    key: "coachassist_tutorial_playbook_seen",
    matches: (path) => /^\/team\/[^/]+\/playbook$/.test(path),
    steps: [
      {
        target: ".tutorial-playbook-title",
        title: "Playbook",
        content: "Your library of reusable play diagrams. Open one to edit, or create a new board.",
      },
    ],
  },
  {
    label: "Playbook Editor tour",
    key: "coachassist_tutorial_playbook_editor_seen",
    matches: (path) => /^\/team\/[^/]+\/playbook\/[^/]+$/.test(path),
    steps: [
      {
        target: ".tutorial-playbook-editor",
        title: "Playbook Editor",
        content: "Draw and annotate plays here. Use the toolbar to add players, routes, and notes.",
      },
    ],
  },
  {
    label: "Game Board tour",
    key: "coachassist_tutorial_gameboard_seen",
    matches: (path) =>
      /^\/team\/[^/]+\/match\/[^/]+\/board(\/[^/]+)?$/.test(path),
    steps: [
      {
        target: ".tutorial-gameboard-title",
        title: "Game Boards",
        content: "Diagram plays tied to this specific game — useful for game-day adjustments.",
      },
    ],
  },
];

export function findTutorial(path) {
  return TUTORIALS.find((t) => t.matches(path)) || null;
}

export default TUTORIALS;
