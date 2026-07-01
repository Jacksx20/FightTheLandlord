"""手牌评估器 - 手牌强度评分与最优拆牌分析"""
from typing import List, Dict
from models.card import Card, RANK_ORDER


class HandEvaluator:
    """手牌评估器 - 评估手牌强度用于叫地主决策"""

    @staticmethod
    def evaluate(hand: List[Card]) -> int:
        """评估手牌强度
        
        评分规则：
        - 大王 +6分
        - 小王 +5分
        - 每个2 +3分
        - 每个A +1分
        - 每个炸弹 +6分
        - 每个三条(非2/A) +1分
        
        Args:
            hand: 手牌列表
            
        Returns:
            手牌强度评分
        """
        score = 0

        # 统计各点数出现次数
        count_map = {}
        for card in hand:
            count_map[card.rank] = count_map.get(card.rank, 0) + 1

        # 大王+6, 小王+5
        if 'BIG_JOKER' in count_map:
            score += 6
        if 'SMALL_JOKER' in count_map:
            score += 5

        # 每个2+3分
        score += count_map.get('2', 0) * 3

        # 每个A+1分
        score += count_map.get('A', 0) * 1

        # 炸弹+6分，三条+1分
        for rank, count in count_map.items():
            if rank in ('SMALL_JOKER', 'BIG_JOKER'):
                continue
            if count == 4:
                score += 6  # 炸弹
            elif count == 3 and rank not in ('2', 'A'):
                score += 1  # 三条

        return score

    @staticmethod
    def count_by_rank(hand: List[Card]) -> Dict[str, int]:
        """统计各点数出现次数"""
        count_map = {}
        for card in hand:
            count_map[card.rank] = count_map.get(card.rank, 0) + 1
        return count_map

    @staticmethod
    def find_bombs(hand: List[Card]) -> List[str]:
        """找出手牌中的炸弹点数"""
        count_map = HandEvaluator.count_by_rank(hand)
        return [rank for rank, count in count_map.items() if count == 4]

    @staticmethod
    def find_rockets(hand: List[Card]) -> bool:
        """检查手牌中是否有火箭（大小王）"""
        ranks = {c.rank for c in hand}
        return 'SMALL_JOKER' in ranks and 'BIG_JOKER' in ranks