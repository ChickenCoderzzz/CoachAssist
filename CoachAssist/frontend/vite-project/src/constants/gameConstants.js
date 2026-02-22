// Initial data structure
export const INITIAL_DATA = {
    "Game State": [],
    "Offensive": [],
    "Defensive": [],
    "Special": [],
    "Videos": []
};

//PLAYER TABLE CONSTANTS
//Defines dynamic structure for individual player tables

//Converts short position codes into fully readable names.
export const POSITION_LABELS = {
    QB: "Quarterback",
    RB: "Running Back",
    FB: "Fullback",
    WR: "Wide Receiver",
    TE: "Tight End",
    LT: "Left Tackle",
    LG: "Left Guard",
    C: "Center",
    RG: "Right Guard",
    RT: "Right Tackle",
    DE: "Defensive End",
    DT: "Defensive Tackle",
    NT: "Nose Tackle",
    OLB: "Outside Linebacker",
    ILB: "Inside Linebacker",
    MLB: "Middle Linebacker",
    CB: "Cornerback",
    FS: "Free Safety",
    SS: "Strong Safety",
    K: "Kicker",
    P: "Punter",
    KR: "Kick Returner",
    PR: "Punt Returner",
    LS: "Long Snapper"
};

//Helper function ensures readable position names are displayed
export const getFullPositionName = (pos) => {
    return POSITION_LABELS[pos] || pos;
};

//Stats applied to all player regardless of position
export const UNIVERSAL_STATS = [
    "snaps_played",
    "penalties",
    "turnovers",
    "touchdowns"
];


// POSITION-SPECIFIC STAT GROUPS
// Core structure that dynamically builds
// the right-hand side of the Player Insights modal.
//
// Structure:
// POSITION → CATEGORY → [stat fields]
//
// This allows the modal to:
// 1. Detect the player's position
// 2. Render only relevant stat categories
// 3. Automatically generate input fields
//
// This makes the system scalable — adding a new stat
// only requires editing this object.
export const POSITION_GROUPS = {
    //OFFENSE
    QB: {
        Passing: ["pass_attempts", "pass_completions", "passing_yards", "passing_tds", "interceptions_thrown"],
        Rushing: ["rush_attempts", "rushing_yards", "rushing_tds"]
    },
    RB: {
        Rushing: ["rush_attempts", "rushing_yards", "rushing_tds"],
        Receiving: ["targets", "receptions", "receiving_yards", "receiving_tds"]
    },
    FB: { Rushing: ["rush_attempts", "rushing_yards"], Blocking: ["lead_blocks"] },
    WR: { Receiving: ["targets", "receptions", "receiving_yards", "receiving_tds", "drops"] },
    TE: { Receiving: ["targets", "receptions", "receiving_yards", "receiving_tds"], Blocking: ["run_block_snaps", "pass_block_snaps"] },
    LT: { Blocking: ["pass_block_snaps", "run_block_snaps", "sacks_allowed"] },
    LG: { Blocking: ["pass_block_snaps", "run_block_snaps", "sacks_allowed"] },
    C: { Blocking: ["pass_block_snaps", "run_block_snaps"], Snapping: ["bad_snaps"] },
    RG: { Blocking: ["pass_block_snaps", "run_block_snaps", "sacks_allowed"] },
    RT: { Blocking: ["pass_block_snaps", "run_block_snaps", "sacks_allowed"] },

    //DEFENSE
    DE: { Defense: ["tackles", "tackles_for_loss", "sacks", "forced_fumbles"] },
    DT: { Defense: ["tackles", "tackles_for_loss", "sacks"] },
    NT: { Defense: ["tackles", "tackles_for_loss"] },
    OLB: { Defense: ["tackles", "sacks", "interceptions", "passes_defended"] },
    ILB: { Defense: ["tackles", "sacks", "interceptions", "passes_defended"] },
    MLB: { Defense: ["tackles", "sacks", "interceptions", "passes_defended"] },
    CB: { Coverage: ["targets_allowed", "completions_allowed", "interceptions", "passes_defended"] },
    FS: { Coverage: ["interceptions", "passes_defended", "tackles"] },
    SS: { Coverage: ["interceptions", "passes_defended", "tackles"] },

    //SPECIAL
    K: { Kicking: ["field_goals_made", "field_goals_attempted", "extra_points_made"] },
    P: { Punting: ["punts", "punt_yards", "punts_inside_20"] },
    KR: { Returns: ["kick_returns", "kick_return_yards", "kick_return_tds"] },
    PR: { Returns: ["punt_returns", "punt_return_yards", "punt_return_tds"] },
    LS: { Snapping: ["total_snaps", "bad_snaps"] }
};
