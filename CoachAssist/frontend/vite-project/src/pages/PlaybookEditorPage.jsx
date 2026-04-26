import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DrawboardWorkspace from "../components/Drawboard/DrawboardWorkspace";
import "../styles/drawboard.css";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export default function PlaybookEditorPage() {
  const { teamId, boardId } = useParams();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetch(`/teams/${teamId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setUserRole(data.team?.user_role || "owner"));
  }, [teamId]);

  const canEdit = userRole === "owner" || userRole === "editor";

  return (
    <div style={{ paddingTop: "110px", paddingBottom: "60px", paddingLeft: "40px", paddingRight: "40px" }}>
      <button
        className="add-team-btn"
        onClick={() => navigate(`/team/${teamId}/playbook`)}
        style={{ marginBottom: "15px" }}
      >
        ← Back to Playbook
      </button>
      <DrawboardWorkspace boardId={boardId} canEdit={canEdit} />
    </div>
  );
}
