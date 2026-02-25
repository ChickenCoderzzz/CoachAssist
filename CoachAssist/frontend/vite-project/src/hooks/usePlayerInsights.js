import { useState } from "react";
import { UNIVERSAL_STATS, POSITION_GROUPS } from "../constants/gameConstants";

export default function usePlayerInsights(matchId) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [playerStats, setPlayerStats] = useState({});
    const [playerNotes, setPlayerNotes] = useState([]);
    const [isSavingPlayer, setIsSavingPlayer] = useState(false);

    // OPEN PLAYER MODAL
    const openPlayerModal = (player) => {
        setSelectedPlayer(player);
        setShowPlayerModal(true);

        //Fetch player insights from this game
        fetch(`/games/${matchId}/players/${player.id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        })
            .then(res => res.json())
            .then(data => {

                // Build default stat structure
                let defaults = {};

                // Universal stats
                UNIVERSAL_STATS.forEach(stat => {
                    defaults[stat] = 0;
                });

                // Position-specific stats
                const groups = POSITION_GROUPS[player.position];
                if (groups) {
                    Object.values(groups).forEach(group => {
                        group.forEach(stat => {
                            defaults[stat] = 0;
                        });
                    });
                }

                setPlayerStats({
                    ...defaults,
                    ...(data.stats || {})
                });

                setPlayerNotes(data.notes || []); //Added by Wences Jacob Lorenzo
            })
            .catch(err => {
                console.error("Failed to load player insights:", err);
            });
    };

    // PLAYER NOTE HANDLERS. Added by Wences Jacob Lorenzo

    // Updates specific note field.
    const updatePlayerNote = (id, field, value) => {
        setPlayerNotes(prev =>
            prev.map(note =>
                note.id === id
                    ? { ...note, [field]: value }
                    : note
            )
        );
    };

    //Add new blank observation row to notes
    const addPlayerNoteRow = () => {
        const newRow = {
            id: Date.now(),
            category: "General",
            note: "",
            time: ""
        };

        setPlayerNotes(prev => [...prev, newRow]);
    };

    //Delete note row
    const deletePlayerNoteRow = (id) => {
        setPlayerNotes(prev =>
            prev.filter(row => row.id !== id)
        );
    };

    // SAVE PLAYER INSIGHTS
    const savePlayerInsights = async () => {
        if (!selectedPlayer) return;

        try {
            setIsSavingPlayer(true);

            const res = await fetch(
                `/games/${matchId}/players/${selectedPlayer.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify({
                        stats: playerStats,
                        notes: playerNotes
                    })
                }
            );

            if (!res.ok) {
                throw new Error("Failed to save player insights");
            }

            //Close modal after successful save
            setShowPlayerModal(false);

        } catch (err) {
            console.error("Failed to save player insights:", err);
            alert("Error saving player insights.");
        } finally {
            setIsSavingPlayer(false);
        }
    };

    //Close modal without saving
    const cancelPlayerModal = () => {
        setShowPlayerModal(false);
    };

    return {
        selectedPlayer,
        showPlayerModal,
        playerStats,
        setPlayerStats,
        playerNotes,
        isSavingPlayer,
        openPlayerModal,
        savePlayerInsights,
        cancelPlayerModal,
        updatePlayerNote,
        addPlayerNoteRow,
        deletePlayerNoteRow
    };
}
