"""叫地主决策 - 手牌强度评估与叫分决策"""
from typing import List
from models.card import Card
from ai.hand_evaluator import HandEvaluator


class BidStrategy:
    """叫地主决策策略"""

    @staticmethod
    def decide(hand: List[Card], current_bid: int = 0) -> int:
        """基于手牌强度评分决策叫分
        
        决策规则：
        - score >= 10 → 叫3分
        - score >= 7 → 叫2分（若当前最高叫分<2）
        - score >= 4 → 叫1分（若当前最高叫分<1）
        - score < 4 → 不叫
        
        Args:
            hand: 手牌列表
            current_bid: 当前最高叫分
            
        Returns:
            叫分值（0=不叫, 1/2/3=叫分）
        """
        score = HandEvaluator.evaluate(hand)

        if score >= 10 and current_bid < 3:
            return 3
        elif score >= 7 and current_bid < 2:
            return 2
        elif score >= 4 and current_bid < 1:
            return 1
        else:
            return 0  # 不叫