export const TUTORIAL_REPLAY_EVENT = "coachassist:tutorial-replay";
export const TUTORIAL_RESET_EVENT = "coachassist:tutorial-reset";
export const TUTORIAL_UNAVAILABLE_EVENT = "coachassist:tutorial-unavailable";

export const TUTORIAL_STORAGE_KEYS = {
  dashboard: "coachassist_tutorial_dashboard_seen",
  team: "coachassist_tutorial_team_seen",
  roster: "coachassist_tutorial_roster_seen",
  gameHistory: "coachassist_tutorial_game_history_seen",
  playerAnalysis: "coachassist_tutorial_player_analysis_seen",
  gameAiAnalysis: "coachassist_tutorial_game_ai_analysis_seen",
  comparison: "coachassist_tutorial_comparison_seen",
  savedPlayerAnalysis: "coachassist_tutorial_saved_player_analysis_seen",
  savedGameAnalysis: "coachassist_tutorial_saved_game_analysis_seen",
  gameAnalysis: "coachassist_tutorial_analyze_seen",
  calendar: "coachassist_tutorial_calendar_seen",
  playbook: "coachassist_tutorial_playbook_seen",
  playbookEditor: "coachassist_tutorial_playbook_editor_seen",
  gameBoards: "coachassist_tutorial_game_boards_seen",
  gameBoardEditor: "coachassist_tutorial_game_board_editor_seen",
  profile: "coachassist_tutorial_profile_seen",
  editProfile: "coachassist_tutorial_edit_profile_seen",
  deleteAccount: "coachassist_tutorial_delete_account_seen",
};

const step = (target, title, content, options = {}) => ({
  target,
  title,
  content,
  disableBeacon: true,
  ...options,
});

export const TUTORIALS = [
  {
    id: "dashboard",
    label: "Dashboard",
    key: TUTORIAL_STORAGE_KEYS.dashboard,
    routePattern: /^\/dashboard$/,
    pathHint: "/dashboard",
    steps: [
      step(".tutorial-dashboard-title", "Dashboard", "This is your team hub. Create teams and open team workspaces here."),
      step(".tutorial-dashboard-add-team", "Create a Team", "Use this button when you need to add a new team."),
      step(".tutorial-dashboard-search", "Find Teams", "Search or filter when your team list grows."),
      step(".tutorial-dashboard-empty", "No Teams Yet", "If this area is empty, start by creating your first team.", { optional: true }),
      step(".tutorial-dashboard-team-card", "Open a Team", "Select a team card to manage games, roster, and tools.", { optional: true }),
    ],
  },
  {
    id: "team",
    label: "Team Page",
    key: TUTORIAL_STORAGE_KEYS.team,
    routePattern: /^\/team\/[^/]+$/,
    steps: [
      step(".tutorial-team-title", "Team Page", "This is the workspace for one team."),
      step(".tutorial-team-edit-details", "Team Details", "Owners can update team name, color, description, and image here.", { optional: true }),
      step(".tutorial-team-roster", "Roster", "Open the roster to add players and review player history."),
      step(".tutorial-team-history", "Game History", "Use this to review past games, stats, and visualizations."),
      step(".tutorial-team-analysis", "AI Analysis", "Generate player, game, and comparison reports from team data."),
      step(".tutorial-team-calendar", "Calendar", "See games by date and export them to a calendar."),
      step(".tutorial-team-playbook", "Playbook", "Create reusable boards for team strategy."),
      step(".tutorial-team-members", "Team Members", "Owners can invite people and manage roles here.", { optional: true }),
      step(".tutorial-team-add-game", "Add Game", "Create a game before tracking stats or film.", { optional: true }),
      step(".tutorial-team-empty-games", "No Games Yet", "If no games appear, add one to begin analysis.", { optional: true }),
    ],
  },
  {
    id: "roster",
    label: "Roster",
    key: TUTORIAL_STORAGE_KEYS.roster,
    routePattern: /^\/teams\/[^/]+\/roster$/,
    steps: [
      step(".tutorial-roster-title", "Roster", "This page manages players by unit and shows player history."),
      step(".tutorial-roster-units", "Units", "Switch between offense, defense, and special teams."),
      step(".tutorial-roster-table", "Players", "This table lists players, positions, priority status, and actions."),
      step(".tutorial-roster-add-player", "Add Player", "Use this to add a new player to the selected unit.", { optional: true }),
      step(".tutorial-roster-player-actions", "Player Actions", "View history, edit player details, or delete a player.", { optional: true }),
      step(".tutorial-roster-history-panel", "Player History", "After selecting a player, their metrics and insights appear here."),
    ],
  },
  {
    id: "gameHistory",
    label: "Game History",
    key: TUTORIAL_STORAGE_KEYS.gameHistory,
    routePattern: /^\/team\/[^/]+\/history$/,
    steps: [
      step(".tutorial-history-title", "Game History", "This page reviews past games, stats, notes, and charts."),
      step(".tutorial-history-toggle", "Views", "Switch between the game table, stats, and visualizations."),
      step(".tutorial-history-table", "Game Table", "Review each game and open details.", { optional: true }),
      step(".tutorial-history-empty", "No Games Yet", "Saved games will appear here after you add them.", { optional: true }),
      step(".tutorial-history-visualizations", "Visualizations", "Use filters and chart controls to compare performance.", { optional: true }),
    ],
  },
  {
    id: "playerAnalysis",
    label: "Player Analysis",
    key: TUTORIAL_STORAGE_KEYS.playerAnalysis,
    routePattern: /^\/team\/[^/]+\/analysis$/,
    tabId: "analyze",
    steps: [
      step(".tutorial-ai-tabs", "AI Analysis", "This page has player, game, comparison, and saved analysis tools."),
      step(".tutorial-player-analysis-tab", "Player Analysis", "Start here to review one player's games and generate feedback."),
      step(".tutorial-player-unit-filter", "Choose Unit", "Pick offense, defense, or special teams."),
      step(".tutorial-player-select-table", "Select Player", "Choose a player to load their history.", { optional: true }),
      step(".tutorial-player-empty", "No Players Yet", "Add players from the roster before running player analysis.", { optional: true }),
      step(".tutorial-analysis-run", "Run AI", "After selecting a player, this button generates feedback.", { optional: true }),
      step(".tutorial-analysis-save", "Save Analysis", "Save AI feedback so you can find it later.", { optional: true }),
    ],
  },
  {
    id: "gameAiAnalysis",
    label: "Game AI Analysis",
    key: TUTORIAL_STORAGE_KEYS.gameAiAnalysis,
    routePattern: /^\/team\/[^/]+\/analysis$/,
    tabId: "game",
    steps: [
      step(".tutorial-ai-tabs", "Game AI Analysis", "Use this tab to summarize a full game with AI."),
      step(".tutorial-game-ai-tab", "Game Analysis", "Open this tab to choose a game and build the report."),
      step(".tutorial-game-ai-list", "Choose Game", "Select a game to load stats, notes, and unit summaries.", { optional: true }),
      step(".tutorial-game-ai-empty", "No Games Yet", "Add games from the team page before running game analysis.", { optional: true }),
      step(".tutorial-game-ai-run", "Run Game AI", "Generate a coach-friendly game summary.", { optional: true }),
      step(".tutorial-game-ai-save", "Save Game Analysis", "Save the result for later review.", { optional: true }),
    ],
  },
  {
    id: "comparison",
    label: "AI Comparison",
    key: TUTORIAL_STORAGE_KEYS.comparison,
    routePattern: /^\/team\/[^/]+\/analysis$/,
    tabId: "comparison",
    steps: [
      step(".tutorial-ai-tabs", "AI Comparison", "Compare players or games to see what changed."),
      step(".tutorial-comparison-tab", "Comparison Tab", "Open this tab for side-by-side AI reports."),
      step(".tutorial-comparison-type", "Comparison Type", "Choose whether to compare games or players."),
      step(".tutorial-comparison-selectors", "Select Items", "Pick the two games or players you want compared.", { optional: true }),
      step(".tutorial-comparison-run", "Run Comparison", "Generate the comparison after your selections are ready."),
    ],
  },
  {
    id: "savedPlayerAnalysis",
    label: "Saved Player Analysis",
    key: TUTORIAL_STORAGE_KEYS.savedPlayerAnalysis,
    routePattern: /^\/team\/[^/]+\/analysis$/,
    tabId: "saved-player",
    steps: [
      step(".tutorial-ai-tabs", "Saved Player Analysis", "Saved player reports live in this tab."),
      step(".tutorial-saved-player-tab", "Saved Player Reports", "Open this tab to review reports you saved earlier."),
      step(".tutorial-saved-player-filters", "Filter Reports", "Filter or search saved reports by unit and player."),
      step(".tutorial-saved-player-list", "Saved Reports", "Select a report to read it.", { optional: true }),
      step(".tutorial-saved-player-empty", "No Saved Reports Yet", "Saved player AI reports will appear here.", { optional: true }),
    ],
  },
  {
    id: "savedGameAnalysis",
    label: "Saved Game Analysis",
    key: TUTORIAL_STORAGE_KEYS.savedGameAnalysis,
    routePattern: /^\/team\/[^/]+\/analysis$/,
    tabId: "saved-game",
    steps: [
      step(".tutorial-ai-tabs", "Saved Game Analysis", "Saved game reports live in this tab."),
      step(".tutorial-saved-game-tab", "Saved Game Reports", "Open this tab to review saved game summaries."),
      step(".tutorial-saved-game-list", "Saved Reports", "Select a saved game report to read it.", { optional: true }),
      step(".tutorial-saved-game-empty", "No Saved Game Reports Yet", "Saved game AI reports will appear here.", { optional: true }),
    ],
  },
  {
    id: "gameAnalysis",
    label: "Game Tracker",
    key: TUTORIAL_STORAGE_KEYS.gameAnalysis,
    routePattern: /^\/team\/[^/]+\/match\/[^/]+$/,
    steps: [
      step(".tutorial-analyze-title", "Game Tracker", "Track film, notes, stats, players, and exports for one game."),
      step(".tutorial-analysis-upload-video", "Upload Video", "Upload film so notes can connect to timestamps.", { optional: true }),
      step(".tutorial-analysis-edit-game", "Edit Game", "Update game details like opponent, date, or score.", { optional: true }),
      step(".tutorial-analysis-boards", "Boards", "Open boards for game-specific diagrams.", { optional: true }),
      step(".tutorial-analysis-tabs", "Sections", "Switch between game state, units, and videos."),
      step(".tutorial-analysis-video", "Video Area", "Watch uploaded film while reviewing notes."),
      step(".tutorial-analysis-table", "Data Table", "Record observations, metrics, and player notes here."),
      step(".tutorial-analysis-add-row", "Add Row", "Add another observation or note.", { optional: true }),
      step(".tutorial-analysis-save-exit", "Save Work", "Save your game updates before leaving."),
      step(".tutorial-analysis-export", "Export", "Export the current table as a report."),
    ],
  },
  {
    id: "calendar",
    label: "Calendar",
    key: TUTORIAL_STORAGE_KEYS.calendar,
    routePattern: /^\/team\/[^/]+\/calendar$/,
    steps: [
      step(".tutorial-calendar-title", "Calendar", "This page shows team games by date."),
      step(".tutorial-calendar-nav", "Change Month", "Move between months to find games."),
      step(".tutorial-calendar-grid", "Game Calendar", "Games appear on their scheduled dates."),
      step(".tutorial-calendar-event", "Open Game", "Click a game to jump to the game tracker.", { optional: true }),
      step(".tutorial-calendar-empty", "No Games This Month", "Add games from the team page to fill the calendar.", { optional: true }),
    ],
  },
  {
    id: "playbook",
    label: "Playbook",
    key: TUTORIAL_STORAGE_KEYS.playbook,
    routePattern: /^\/team\/[^/]+\/playbook$/,
    steps: [
      step(".tutorial-playbook-title", "Playbook", "Create reusable boards for strategy and practice."),
      step(".tutorial-playbook-new-board", "New Board", "Owners and editors can create a playbook board here.", { optional: true }),
      step(".tutorial-playbook-board-list", "Boards", "Open an existing board to edit or review it."),
      step(".tutorial-playbook-empty", "No Boards Yet", "Create your first board when the playbook is empty.", { optional: true }),
    ],
  },
  {
    id: "playbookEditor",
    label: "Playbook Editor",
    key: TUTORIAL_STORAGE_KEYS.playbookEditor,
    routePattern: /^\/team\/[^/]+\/playbook\/[^/]+$/,
    steps: [
      step(".tutorial-playbook-editor", "Board Editor", "Draw, arrange, and save playbook ideas here."),
      step(".tutorial-drawboard-workspace", "Workspace", "Use this canvas area to build the board.", { optional: true }),
    ],
  },
  {
    id: "gameBoards",
    label: "Game Boards",
    key: TUTORIAL_STORAGE_KEYS.gameBoards,
    routePattern: /^\/team\/[^/]+\/match\/[^/]+\/board$/,
    steps: [
      step(".tutorial-game-boards-title", "Game Boards", "These boards are attached to one specific game."),
      step(".tutorial-game-boards-new", "New Board", "Create a board for this game.", { optional: true }),
      step(".tutorial-game-boards-list", "Boards", "Open a board to diagram game-specific ideas."),
      step(".tutorial-game-boards-empty", "No Boards Yet", "Create a board when this list is empty.", { optional: true }),
    ],
  },
  {
    id: "gameBoardEditor",
    label: "Game Board Editor",
    key: TUTORIAL_STORAGE_KEYS.gameBoardEditor,
    routePattern: /^\/team\/[^/]+\/match\/[^/]+\/board\/[^/]+$/,
    steps: [
      step(".tutorial-game-board-editor", "Game Board Editor", "Edit a board connected to this game."),
      step(".tutorial-drawboard-workspace", "Workspace", "Use this canvas area for game-specific diagrams.", { optional: true }),
    ],
  },
  {
    id: "profile",
    label: "Profile",
    key: TUTORIAL_STORAGE_KEYS.profile,
    routePattern: /^\/profile$/,
    pathHint: "/profile",
    steps: [
      step(".tutorial-profile-title", "Profile", "This page shows your account details and settings."),
      step(".tutorial-profile-details", "Account Details", "Review your email, username, and full name."),
      step(".tutorial-profile-settings", "Password", "Change your password from here."),
      step(".tutorial-profile-delete", "Delete Account", "Use this only if you need to remove your account."),
      step(".tutorial-profile-logout", "Log Out", "Sign out when you are done."),
    ],
  },
  {
    id: "editProfile",
    label: "Password Settings",
    key: TUTORIAL_STORAGE_KEYS.editProfile,
    routePattern: /^\/edit-profile$/,
    pathHint: "/edit-profile",
    steps: [
      step(".tutorial-edit-profile-title", "Password Settings", "Request a verification code before changing your password."),
      step(".tutorial-edit-profile-send", "Send Code", "This sends a password change code to your email."),
      step(".tutorial-edit-profile-back", "Back", "Return to your profile without changing anything."),
    ],
  },
  {
    id: "deleteAccount",
    label: "Delete Account",
    key: TUTORIAL_STORAGE_KEYS.deleteAccount,
    routePattern: /^\/delete-account$/,
    pathHint: "/delete-account",
    steps: [
      step(".tutorial-delete-account-title", "Delete Account", "This page is only for permanently removing your account."),
      step(".tutorial-delete-account-warning", "Warning", "Read this carefully before continuing."),
      step(".tutorial-delete-account-confirm", "Confirm Delete", "This action removes your account."),
      step(".tutorial-delete-account-cancel", "Cancel", "Use this to return to your profile."),
    ],
  },
];

export const FULL_WORKFLOW_TUTORIAL = {
  id: "fullWorkflow",
  label: "Full CoachAssist Workflow",
  key: "coachassist_tutorial_full_workflow_seen",
  pathHint: "/dashboard",
  steps: [
    "Dashboard: create or open a team.",
    "Team Page: add players and games.",
    "Roster: keep player information current.",
    "Game Tracker: upload film, add notes, save, and export.",
    "AI Analysis: generate and save player or game reports.",
  ],
};

export const getTutorialById = (id) =>
  TUTORIALS.find((tutorial) => tutorial.id === id) || null;

export const getTutorialsForPath = (pathname) =>
  TUTORIALS.filter((tutorial) => tutorial.routePattern.test(pathname));

export const getDefaultTutorialForPath = (pathname) =>
  getTutorialsForPath(pathname)[0] || null;

export const getTutorialStatus = (tutorial) =>
  localStorage.getItem(tutorial.key) === "true";

export const clearTutorialStatus = (tutorialId) => {
  const tutorial = getTutorialById(tutorialId);
  if (!tutorial) return false;
  localStorage.removeItem(tutorial.key);
  window.dispatchEvent(new CustomEvent(TUTORIAL_RESET_EVENT));
  return true;
};

export const requestTutorialReplay = (tutorialId = null) => {
  window.dispatchEvent(
    new CustomEvent(TUTORIAL_REPLAY_EVENT, {
      detail: { tutorialId },
    })
  );
};

export const notifyTutorialUnavailable = (message = "No tutorial available for this page yet.") => {
  window.dispatchEvent(
    new CustomEvent(TUTORIAL_UNAVAILABLE_EVENT, {
      detail: { message },
    })
  );
};
