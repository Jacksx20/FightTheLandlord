"""牌型识别器 - 识别13种合法牌型"""
from typing import List, Optional, Dict
from models.card import Card, RANK_ORDER
from models.pattern import (
    Pattern, ROCKET, BOMB, SINGLE, PAIR, TRIPLE,
    TRIPLE_ONE, TRIPLE_TWO, STRAIGHT, STRAIGHT_PAIR,
    AIRPLANE, AIRPLANE_SINGLE, AIRPLANE_PAIR,
    FOUR_TWO_SINGLE, FOUR_TWO_PAIR
)


class PatternRecognizer:
    """牌型识别器 - 识别一组牌的合法牌型"""

    @staticmethod
    def recognize(cards: List[Card]) -> Optional[Pattern]:
        """识别一组牌的牌型
        
        按算法流程依次识别：火箭→炸弹→单张→对子→三条→三带一→三带二
        →顺子→连对→飞机不带→飞机带单→飞机带对→四带二单→四带二对
        
        Args:
            cards: 待识别的牌列表
            
        Returns:
            识别出的牌型，非法牌型返回None
        """
        if not cards:
            return None

        n = len(cards)

        # 统计各点数出现次数
        count_map = PatternRecognizer._count_ranks(cards)

        # 按出现次数分组
        groups = PatternRecognizer._group_by_count(count_map)

        # 1. 判断火箭：2张牌且含大小王
        if n == 2 and 'SMALL_JOKER' in count_map and 'BIG_JOKER' in count_map:
            return Pattern(type=ROCKET, main_rank=17, length=1, cards=cards)

        # 2. 判断炸弹：4张同点数
        if n == 4 and len(groups.get(4, [])) == 1:
            rank = groups[4][0]
            return Pattern(type=BOMB, main_rank=RANK_ORDER[rank], length=1, cards=cards)

        # 3. 判断单张
        if n == 1:
            rank = list(count_map.keys())[0]
            return Pattern(type=SINGLE, main_rank=RANK_ORDER[rank], length=1, cards=cards)

        # 4. 判断对子
        if n == 2 and len(groups.get(2, [])) == 1:
            rank = groups[2][0]
            return Pattern(type=PAIR, main_rank=RANK_ORDER[rank], length=1, cards=cards)

        # 5. 判断三条
        if n == 3 and len(groups.get(3, [])) == 1:
            rank = groups[3][0]
            return Pattern(type=TRIPLE, main_rank=RANK_ORDER[rank], length=1, cards=cards)

        # 6. 判断三带一
        if n == 4 and len(groups.get(3, [])) == 1 and len(groups.get(1, [])) == 1:
            rank = groups[3][0]
            return Pattern(type=TRIPLE_ONE, main_rank=RANK_ORDER[rank], length=1, cards=cards)

        # 7. 判断三带二（带的必须是对子）
        if n == 5 and len(groups.get(3, [])) == 1 and len(groups.get(2, [])) == 1:
            rank = groups[3][0]
            return Pattern(type=TRIPLE_TWO, main_rank=RANK_ORDER[rank], length=1, cards=cards)

        # 8. 判断顺子：5张及以上连续单牌，范围3-A，不含2和王
        straight = PatternRecognizer._check_straight(count_map, n)
        if straight is not None:
            return straight

        # 9. 判断连对：3对及以上连续对子，范围3-A
        straight_pair = PatternRecognizer._check_straight_pair(count_map, n)
        if straight_pair is not None:
            return straight_pair

        # 10. 判断飞机不带：2组及以上连续三条
        airplane = PatternRecognizer._check_airplane(count_map, groups, n)
        if airplane is not None:
            return airplane

        # 11. 判断飞机带单
        airplane_single = PatternRecognizer._check_airplane_single(count_map, groups, n)
        if airplane_single is not None:
            return airplane_single

        # 12. 判断飞机带对
        airplane_pair = PatternRecognizer._check_airplane_pair(count_map, groups, n)
        if airplane_pair is not None:
            return airplane_pair

        # 13. 判断四带二单
        four_two_single = PatternRecognizer._check_four_two_single(groups, n)
        if four_two_single is not None:
            return four_two_single

        # 14. 判断四带二对
        four_two_pair = PatternRecognizer._check_four_two_pair(groups, n)
        if four_two_pair is not None:
            return four_two_pair

        # 以上均不满足 → 非法牌型
        return None

    @staticmethod
    def _count_ranks(cards: List[Card]) -> Dict[str, int]:
        """统计各点数出现次数"""
        count_map = {}
        for card in cards:
            count_map[card.rank] = count_map.get(card.rank, 0) + 1
        return count_map

    @staticmethod
    def _group_by_count(count_map: Dict[str, int]) -> Dict[int, List[str]]:
        """按出现次数分组
        
        Returns:
            {1: [单张点数列表], 2: [对子点数列表], 3: [三条点数列表], 4: [四条点数列表]}
        """
        groups = {}
        for rank, count in count_map.items():
            if count not in groups:
                groups[count] = []
            groups[count].append(rank)
        # 每组内按点数排序
        for count in groups:
            groups[count].sort(key=lambda r: RANK_ORDER[r])
        return groups

    @staticmethod
    def _is_consecutive_ranks(ranks: List[str], min_rank: int = 3, max_rank: int = 14) -> bool:
        """判断点数列表是否连续且在指定范围内
        
        Args:
            ranks: 点数列表（已排序）
            min_rank: 最小点数（默认3，即'3'）
            max_rank: 最大点数（默认14，即'A'）
        """
        if not ranks:
            return False
        orders = [RANK_ORDER[r] for r in ranks]
        # 检查范围：不含2(15)和王(16,17)
        if orders[0] < min_rank or orders[-1] > max_rank:
            return False
        # 检查连续性
        for i in range(1, len(orders)):
            if orders[i] - orders[i - 1] != 1:
                return False
        return True

    @staticmethod
    def _check_straight(count_map: Dict[str, int], n: int) -> Optional[Pattern]:
        """判断顺子：5张及以上连续单牌，范围3-A"""
        if n < 5:
            return None
        # 所有牌必须都是单张
        if any(count != 1 for count in count_map.values()):
            return None
        ranks = sorted(count_map.keys(), key=lambda r: RANK_ORDER[r])
        if not PatternRecognizer._is_consecutive_ranks(ranks):
            return None
        main_rank = RANK_ORDER[ranks[-1]]  # 最大点数作为主牌
        return Pattern(type=STRAIGHT, main_rank=main_rank, length=n, cards=[])

    @staticmethod
    def _check_straight_pair(count_map: Dict[str, int], n: int) -> Optional[Pattern]:
        """判断连对：3对及以上连续对子，范围3-A"""
        if n < 6 or n % 2 != 0:
            return None
        # 所有牌必须都是对子
        if any(count != 2 for count in count_map.values()):
            return None
        ranks = sorted(count_map.keys(), key=lambda r: RANK_ORDER[r])
        if not PatternRecognizer._is_consecutive_ranks(ranks):
            return None
        pair_count = n // 2
        if pair_count < 3:
            return None
        main_rank = RANK_ORDER[ranks[-1]]
        return Pattern(type=STRAIGHT_PAIR, main_rank=main_rank, length=pair_count, cards=[])

    @staticmethod
    def _check_airplane(count_map: Dict[str, int], groups: Dict[int, List[str]], n: int) -> Optional[Pattern]:
        """判断飞机不带：2组及以上连续三条，范围3-A"""
        triple_ranks = groups.get(3, [])
        if len(triple_ranks) < 2:
            return None
        # 必须全是三条，没有其他牌
        if n != len(triple_ranks) * 3:
            return None
        if not PatternRecognizer._is_consecutive_ranks(triple_ranks):
            return None
        main_rank = RANK_ORDER[triple_ranks[-1]]
        return Pattern(type=AIRPLANE, main_rank=main_rank, length=len(triple_ranks), cards=[])

    @staticmethod
    def _check_airplane_single(count_map: Dict[str, int], groups: Dict[int, List[str]], n: int) -> Optional[Pattern]:
        """判断飞机带单：N组连续三条 + N张单牌"""
        # 找出所有可能的连续三条组合
        triple_ranks = groups.get(3, [])
        four_ranks = groups.get(4, [])
        
        # 尝试从三条中找连续组合
        if len(triple_ranks) >= 2:
            consecutive = PatternRecognizer._find_longest_consecutive(triple_ranks)
            for seq_len in range(len(consecutive), 1, -1):
                for start in range(len(consecutive) - seq_len + 1):
                    sub = consecutive[start:start + seq_len]
                    expected_n = seq_len * 4  # 每组三条带一张单牌
                    if n == expected_n:
                        main_rank = RANK_ORDER[sub[-1]]
                        return Pattern(type=AIRPLANE_SINGLE, main_rank=main_rank, length=seq_len, cards=[])
        
        # 也考虑四条被拆成三条+单张的情况
        if four_ranks:
            # 将四条中取出一张作为单牌，剩余三张作为三条
            all_triple = triple_ranks + four_ranks
            all_triple.sort(key=lambda r: RANK_ORDER[r])
            if len(all_triple) >= 2:
                consecutive = PatternRecognizer._find_longest_consecutive(all_triple)
                for seq_len in range(len(consecutive), 1, -1):
                    for start in range(len(consecutive) - seq_len + 1):
                        sub = consecutive[start:start + seq_len]
                        expected_n = seq_len * 4
                        if n == expected_n:
                            main_rank = RANK_ORDER[sub[-1]]
                            return Pattern(type=AIRPLANE_SINGLE, main_rank=main_rank, length=seq_len, cards=[])
        return None

    @staticmethod
    def _check_airplane_pair(count_map: Dict[str, int], groups: Dict[int, List[str]], n: int) -> Optional[Pattern]:
        """判断飞机带对：N组连续三条 + N对对子"""
        triple_ranks = groups.get(3, [])
        pair_ranks = groups.get(2, [])
        
        if len(triple_ranks) >= 2:
            consecutive = PatternRecognizer._find_longest_consecutive(triple_ranks)
            for seq_len in range(len(consecutive), 1, -1):
                for start in range(len(consecutive) - seq_len + 1):
                    sub = consecutive[start:start + seq_len]
                    expected_n = seq_len * 5  # 每组三条带一对
                    if n == expected_n:
                        # 验证剩余牌全是对子
                        remaining_pair_count = len(pair_ranks)
                        if remaining_pair_count == seq_len:
                            main_rank = RANK_ORDER[sub[-1]]
                            return Pattern(type=AIRPLANE_PAIR, main_rank=main_rank, length=seq_len, cards=[])
        return None

    @staticmethod
    def _check_four_two_single(groups: Dict[int, List[str]], n: int) -> Optional[Pattern]:
        """判断四带二单：4张同点数 + 2张单牌"""
        if n != 6:
            return None
        four_ranks = groups.get(4, [])
        if len(four_ranks) != 1:
            return None
        rank = four_ranks[0]
        return Pattern(type=FOUR_TWO_SINGLE, main_rank=RANK_ORDER[rank], length=1, cards=[])

    @staticmethod
    def _check_four_two_pair(groups: Dict[int, List[str]], n: int) -> Optional[Pattern]:
        """判断四带二对：4张同点数 + 2对对子"""
        if n != 8:
            return None
        four_ranks = groups.get(4, [])
        pair_ranks = groups.get(2, [])
        if len(four_ranks) != 1:
            return None
        if len(pair_ranks) != 2:
            return None
        rank = four_ranks[0]
        return Pattern(type=FOUR_TWO_PAIR, main_rank=RANK_ORDER[rank], length=1, cards=[])

    @staticmethod
    def _find_longest_consecutive(ranks: List[str]) -> List[str]:
        """从点数列表中找出最长连续子序列（范围3-A）"""
        if not ranks:
            return []
        # 排序并去重
        sorted_ranks = sorted(set(ranks), key=lambda r: RANK_ORDER[r])
        # 过滤掉2和王
        sorted_ranks = [r for r in sorted_ranks if RANK_ORDER[r] <= 14]
        
        if not sorted_ranks:
            return []
        
        best = [sorted_ranks[0]]
        current = [sorted_ranks[0]]
        
        for i in range(1, len(sorted_ranks)):
            if RANK_ORDER[sorted_ranks[i]] - RANK_ORDER[sorted_ranks[i - 1]] == 1:
                current.append(sorted_ranks[i])
            else:
                if len(current) > len(best):
                    best = current
                current = [sorted_ranks[i]]
        
        if len(current) > len(best):
            best = current
        return best