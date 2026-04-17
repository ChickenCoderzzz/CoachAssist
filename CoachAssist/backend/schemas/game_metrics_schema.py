from pydantic import BaseModel
from typing import Dict, Optional

class QuarterMetrics(BaseModel):
    points: Optional[int] = 0
    total_yards: Optional[int] = 0
    turnovers: Optional[int] = 0
    penalties: Optional[int] = 0
    penalty_yards: Optional[int] = 0
    third_down_conversions: Optional[int] = 0
    third_down_attempts: Optional[int] = 0
    time_of_possession: Optional[int] = 0

    #(Opponent)
    opp_points: Optional[int] = 0
    opp_total_yards: Optional[int] = 0
    opp_turnovers: Optional[int] = 0
    opp_penalties: Optional[int] = 0
    opp_penalty_yards: Optional[int] = 0
    opp_third_down_conversions: Optional[int] = 0
    opp_third_down_attempts: Optional[int] = 0
    opp_time_of_possession: Optional[int] = 0


class GameMetricsUpdate(BaseModel):
    metrics: Dict[str, QuarterMetrics]