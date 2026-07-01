"""牌型模型 - 表示识别出的合法牌型"""
from dataclasses import dataclass, field
from typing import List
from .card import Card


# 14种牌型常量
ROCKET = "rocket"                # 火箭：大小王
BOMB = "bomb"                    # 炸弹：四张同点数
SINGLE = "single"                # 单张
PAIR = "pair"                    # 对子
TRIPLE = "triple"                # 三条
TRIPLE_ONE = "triple_one"        # 三带一
TRIPLE_TWO = "triple_two"        # 三带二
STRAIGHT = "straight"            # 顺子
STRAIGHT_PAIR = "straight_pair"  # 连对
AIRPLANE = "airplane"            # 飞机不带
AIRPLANE_SINGLE = "airplane_single"  # 飞机带单
AIRPLANE_PAIR = "airplane_pair"      # 飞机带对
FOUR_TWO_SINGLE = "four_two_single"  # 四带二单
FOUR_TWO_PAIR = "four_two_pair"      # 四带二对

# 牌型中文名称映射（用于前端提示）
PATTERN_NAMES = {
    ROCKET: "火箭",
    BOMB: "炸弹",
    SINGLE: "单张",
    PAIR: "对子",
    TRIPLE: "三条",
    TRIPLE_ONE: "三带一",
    TRIPLE_TWO: "三带二",
    STRAIGHT: "顺子",
    STRAIGHT_PAIR: "连对",
    AIRPLANE: "飞机",
    AIRPLANE_SINGLE: "飞机带单",
    AIRPLANE_PAIR: "飞机带对",
    FOUR_TWO_SINGLE: "四带二",
    FOUR_TWO_PAIR: "四带二对",
}


@dataclass
class Pattern:
    """牌型数据模型
    
    Attributes:
        type: 牌型类型枚举
        main_rank: 主牌点数排序值（用于大小比较）
        length: 牌型长度（顺子张数/连对对数/飞机组数等）
        cards: 组成该牌型的牌
    """
    type: str
    main_rank: int
    length: int
    cards: List[Card] = field(default_factory=list)

    @property
    def name(self) -> str:
        """牌型中文名称"""
        return PATTERN_NAMES.get(self.type, "未知")

    @property
    def is_bomb(self) -> bool:
        """是否为炸弹或火箭"""
        return self.type in (BOMB, ROCKET)

    def to_dict(self) -> dict:
        """序列化为字典"""
        return {
            'type': self.type,
            'name': self.name,
            'mainRank': self.main_rank,
            'length': self.length,
            'cards': [c.to_dict() for c in self.cards]
        }