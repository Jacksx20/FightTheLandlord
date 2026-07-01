"""出牌记录模型 - 记录一次出牌或过牌行为"""
from dataclasses import dataclass, field
from typing import List, Optional
from .card import Card


@dataclass
class PlayRecord:
    """出牌记录模型
    
    Attributes:
        player_id: 出牌玩家ID
        cards: 出的牌列表
        pattern_type: 牌型类型
        is_pass: 是否过牌
        timestamp: 出牌时间戳
    """
    player_id: int
    cards: List[Card] = field(default_factory=list)
    pattern_type: Optional[str] = None
    is_pass: bool = False
    timestamp: float = 0.0

    def to_dict(self) -> dict:
        """序列化为字典"""
        return {
            'playerId': self.player_id,
            'cards': [c.to_dict() for c in self.cards],
            'patternType': self.pattern_type,
            'isPass': self.is_pass,
            'timestamp': self.timestamp
        }


@dataclass
class BidRecord:
    """叫分记录模型
    
    Attributes:
        player_id: 叫分玩家ID
        score: 叫分值（0=不叫）
        timestamp: 叫分时间戳
    """
    player_id: int
    score: int
    timestamp: float = 0.0

    def to_dict(self) -> dict:
        """序列化为字典"""
        return {
            'playerId': self.player_id,
            'score': self.score,
            'timestamp': self.timestamp
        }