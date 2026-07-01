"""牌型比较器 - 同类型比较与跨类型压制判定"""
from typing import Optional
from models.pattern import (
    Pattern, ROCKET, BOMB, STRAIGHT, STRAIGHT_PAIR,
    AIRPLANE, AIRPLANE_SINGLE, AIRPLANE_PAIR
)


class PatternComparator:
    """牌型比较器 - 判断当前出牌是否可以压过上家出牌"""

    @staticmethod
    def can_beat(played: Pattern, last_played: Pattern) -> bool:
        """判断当前出牌是否可以压过上家出牌
        
        规则：
        1. 火箭最大，可压任意牌型
        2. 炸弹可压除火箭外的任意牌型
        3. 同类型牌型按主牌点数比较
        4. 顺子/连对/飞机需长度相同才可比较
        5. 不同类型（非炸弹/火箭）不可压
        
        Args:
            played: 当前出牌的牌型
            last_played: 上家出牌的牌型
            
        Returns:
            True=可压, False=不可压
        """
        # 1. 火箭最大，可压任意牌型
        if played.type == ROCKET:
            return True

        # 2. 上家出火箭，无法压过
        if last_played.type == ROCKET:
            return False

        # 3. 当前出炸弹
        if played.type == BOMB:
            # 上家也是炸弹，比主牌点数
            if last_played.type == BOMB:
                return played.main_rank > last_played.main_rank
            # 上家非炸弹，炸弹可压
            return True

        # 4. 上家出炸弹，当前非炸弹非火箭，不可压
        if last_played.type == BOMB:
            return False

        # 5. 同类型比较
        if played.type == last_played.type:
            # 顺子/连对/飞机需长度相同
            if played.type in (STRAIGHT, STRAIGHT_PAIR, AIRPLANE, AIRPLANE_SINGLE, AIRPLANE_PAIR):
                if played.length != last_played.length:
                    return False
            # 同类型按主牌点数比较
            return played.main_rank > last_played.main_rank

        # 6. 不同类型（非炸弹/火箭）不可压
        return False