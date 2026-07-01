"""扑克牌模型 - 表示一张标准扑克牌"""
from dataclasses import dataclass, field
from typing import Dict


# 点数排序映射：用于大小比较
RANK_ORDER: Dict[str, int] = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
    'SMALL_JOKER': 16, 'BIG_JOKER': 17
}

# 点数显示映射：用于前端展示
RANK_DISPLAY: Dict[str, str] = {
    'SMALL_JOKER': '小', 'BIG_JOKER': '大'
}


@dataclass
class Card:
    """扑克牌数据模型
    
    Attributes:
        id: 唯一标识 1-54
        suit: 花色 ♠♥♣♦ / joker
        rank: 点数 3-10/J/Q/K/A/2/SMALL_JOKER/BIG_JOKER
        face_up: 是否正面朝上
    """
    id: int
    suit: str
    rank: str
    face_up: bool = True

    @property
    def rank_order(self) -> int:
        """点数排序值，用于大小比较"""
        return RANK_ORDER[self.rank]

    @property
    def is_red(self) -> bool:
        """是否红色花色（♥♦）"""
        return self.suit in ('♥', '♦')

    @property
    def display_rank(self) -> str:
        """用于前端显示的点数文本"""
        return RANK_DISPLAY.get(self.rank, self.rank)

    @property
    def display_suit(self) -> str:
        """用于前端显示的花色文本"""
        if self.suit == 'joker':
            return '🃏'
        return self.suit

    def to_dict(self) -> dict:
        """序列化为字典，用于API响应"""
        return {
            'id': self.id,
            'suit': self.suit,
            'rank': self.rank,
            'faceUp': self.face_up,
            'rankOrder': self.rank_order,
            'isRed': self.is_red,
            'displayRank': self.display_rank,
            'displaySuit': self.display_suit
        }

    @staticmethod
    def from_dict(data: dict) -> 'Card':
        """从字典反序列化"""
        return Card(
            id=data['id'],
            suit=data['suit'],
            rank=data['rank'],
            face_up=data.get('faceUp', True)
        )

    def __eq__(self, other):
        if not isinstance(other, Card):
            return False
        return self.id == other.id

    def __hash__(self):
        return hash(self.id)

    def __repr__(self):
        if self.rank in ('SMALL_JOKER', 'BIG_JOKER'):
            return f"Card({self.display_rank}王)"
        return f"Card({self.suit}{self.rank})"