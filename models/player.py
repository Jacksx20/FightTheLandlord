"""玩家模型 - 表示一位游戏参与者"""
from dataclasses import dataclass, field
from typing import List, Optional
from .card import Card


@dataclass
class Player:
    """玩家数据模型
    
    Attributes:
        id: 玩家ID 0=人类, 1=AI左, 2=AI右
        name: 玩家名称
        role: 角色 landlord/farmer/undefined
        hand_cards: 手牌列表
        is_ai: 是否AI玩家
        last_play: 最近一次出牌
    """
    id: int
    name: str
    role: str = "undefined"
    hand_cards: List[Card] = field(default_factory=list)
    is_ai: bool = False
    last_play: Optional[List[Card]] = None

    @property
    def hand_card_count(self) -> int:
        """剩余手牌数"""
        return len(self.hand_cards)

    @property
    def is_landlord(self) -> bool:
        """是否为地主"""
        return self.role == "landlord"

    def sort_hand(self) -> None:
        """手牌按点数降序排列"""
        self.hand_cards.sort(key=lambda c: c.rank_order, reverse=True)

    def remove_cards(self, cards: List[Card]) -> None:
        """从手牌中移除指定牌"""
        card_ids = {c.id for c in cards}
        self.hand_cards = [c for c in self.hand_cards if c.id not in card_ids]

    def has_cards(self, cards: List[Card]) -> bool:
        """检查手牌中是否包含指定的所有牌"""
        hand_ids = {c.id for c in self.hand_cards}
        return all(c.id in hand_ids for c in cards)

    def to_dict(self, hide_cards: bool = False) -> dict:
        """序列化为字典
        
        Args:
            hide_cards: 是否隐藏手牌详情（AI玩家不公开手牌）
        """
        result = {
            'id': self.id,
            'name': self.name,
            'role': self.role,
            'handCardCount': self.hand_card_count,
            'isAI': self.is_ai,
            'isLandlord': self.is_landlord,
        }
        if not hide_cards:
            result['handCards'] = [c.to_dict() for c in self.hand_cards]
        if self.last_play is not None:
            result['lastPlay'] = [c.to_dict() for c in self.last_play]
        else:
            result['lastPlay'] = None
        return result