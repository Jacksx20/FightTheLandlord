"""出牌策略 - 分层策略架构（自由出牌/跟牌/队友配合/地主压制）"""
from typing import List, Optional, Dict, Tuple
from models.card import Card, RANK_ORDER
from models.game_state import GameState
from models.pattern import (
    Pattern, SINGLE, PAIR, TRIPLE, TRIPLE_ONE, TRIPLE_TWO,
    STRAIGHT, STRAIGHT_PAIR, AIRPLANE, AIRPLANE_SINGLE, AIRPLANE_PAIR,
    FOUR_TWO_SINGLE, FOUR_TWO_PAIR, BOMB, ROCKET
)
from engine.pattern_recognizer import PatternRecognizer
from engine.pattern_comparator import PatternComparator


class PlayStrategy:
    """AI出牌策略 - 分层策略架构"""

    @staticmethod
    def decide(hand: List[Card], game_state: GameState, player_id: int) -> Dict:
        """AI出牌决策
        
        分层策略：
        1. 自由出牌策略：获得自由出牌权时
        2. 跟牌策略：需压上家时
        3. 队友配合策略：农民AI识别队友
        4. 地主压制策略：地主AI
        
        Args:
            hand: 当前手牌
            game_state: 游戏状态
            player_id: AI玩家ID
            
        Returns:
            {'action': 'play'/'pass', 'cards': [...], 'pattern': Pattern}
        """
        player = game_state.get_player(player_id)

        # 1. 自由出牌策略
        if game_state.is_free_play or game_state.last_play is None:
            cards = PlayStrategy._free_play(hand, game_state, player_id)
            if cards:
                pattern = PatternRecognizer.recognize(cards)
                return {'action': 'play', 'cards': cards, 'pattern': pattern}
            # 无法出牌（不应该发生），出最小单张
            if hand:
                return {'action': 'play', 'cards': [hand[-1]], 'pattern': PatternRecognizer.recognize([hand[-1]])}
            return {'action': 'pass', 'cards': None, 'pattern': None}

        # 2. 队友配合策略（农民AI）
        if player and player.role == 'farmer':
            last_play_by = game_state.last_play_by
            last_player = game_state.get_player(last_play_by) if last_play_by is not None else None
            # 队友出牌，优先过牌配合
            if last_player and last_player.role == 'farmer':
                # 队友剩牌少，帮队友走牌，不过牌
                if last_player.hand_card_count <= 2:
                    pass  # 继续尝试压制
                else:
                    return {'action': 'pass', 'cards': None, 'pattern': None}

        # 3. 跟牌策略
        last_pattern = PatternRecognizer.recognize(game_state.last_play)
        if last_pattern:
            cards = PlayStrategy._follow_play(hand, last_pattern, game_state, player_id)
            if cards:
                pattern = PatternRecognizer.recognize(cards)
                return {'action': 'play', 'cards': cards, 'pattern': pattern}

        # 4. 无法跟牌，考虑炸弹/火箭
        bomb_cards = PlayStrategy._try_bomb_or_rocket(hand, last_pattern)
        if bomb_cards:
            # 仅在关键时刻使用炸弹
            if PlayStrategy._should_use_bomb(game_state, player_id):
                pattern = PatternRecognizer.recognize(bomb_cards)
                return {'action': 'play', 'cards': bomb_cards, 'pattern': pattern}

        # 无法出牌，过牌
        return {'action': 'pass', 'cards': None, 'pattern': None}

    @staticmethod
    def hint(hand: List[Card], game_state: GameState, player_id: int) -> Optional[List[Card]]:
        """出牌提示 - 为人类玩家提供出牌建议
        
        Args:
            hand: 当前手牌
            game_state: 游戏状态
            player_id: 玩家ID
            
        Returns:
            建议出的牌列表，无合法出牌返回None
        """
        # 自由出牌
        if game_state.is_free_play or game_state.last_play is None:
            cards = PlayStrategy._free_play(hand, game_state, player_id)
            return cards if cards else None

        # 跟牌
        last_pattern = PatternRecognizer.recognize(game_state.last_play)
        if last_pattern:
            cards = PlayStrategy._follow_play(hand, last_pattern, game_state, player_id)
            if cards:
                return cards

        # 尝试炸弹
        bomb_cards = PlayStrategy._try_bomb_or_rocket(hand, last_pattern)
        if bomb_cards:
            return bomb_cards

        return None

    @staticmethod
    def _free_play(hand: List[Card], game_state: GameState, player_id: int) -> Optional[List[Card]]:
        """自由出牌策略 - 优先出小牌保留大牌
        
        策略优先级：
        1. 若剩余牌可一次性出完则直接出完
        2. 顺子/连对/飞机优先出（消耗多张牌）
        3. 三带一/三带二
        4. 对子
        5. 单张最小牌
        """
        if not hand:
            return None

        # 检查能否一次出完
        pattern = PatternRecognizer.recognize(hand)
        if pattern:
            return list(hand)

        count_map = PlayStrategy._count_by_rank(hand)

        # 尝试出顺子
        straight = PlayStrategy._find_straight_in_hand(hand, count_map)
        if straight:
            return straight

        # 尝试出连对
        straight_pair = PlayStrategy._find_straight_pair_in_hand(hand, count_map)
        if straight_pair:
            return straight_pair

        # 尝试出三带一/三带二
        triple_with = PlayStrategy._find_triple_with_in_hand(hand, count_map)
        if triple_with:
            return triple_with

        # 尝试出对子（最小对子）
        pair = PlayStrategy._find_smallest_pair(hand, count_map)
        if pair:
            return pair

        # 出最小单张
        return [hand[-1]]

    @staticmethod
    def _follow_play(hand: List[Card], last_pattern: Pattern, game_state: GameState, player_id: int) -> Optional[List[Card]]:
        """跟牌策略 - 寻找同类型最小可压牌型"""
        count_map = PlayStrategy._count_by_rank(hand)

        if last_pattern.type == SINGLE:
            return PlayStrategy._find_beat_single(hand, last_pattern.main_rank)
        elif last_pattern.type == PAIR:
            return PlayStrategy._find_beat_pair(hand, count_map, last_pattern.main_rank)
        elif last_pattern.type == TRIPLE:
            return PlayStrategy._find_beat_triple(hand, count_map, last_pattern.main_rank)
        elif last_pattern.type == TRIPLE_ONE:
            return PlayStrategy._find_beat_triple_one(hand, count_map, last_pattern.main_rank)
        elif last_pattern.type == TRIPLE_TWO:
            return PlayStrategy._find_beat_triple_two(hand, count_map, last_pattern.main_rank)
        elif last_pattern.type == STRAIGHT:
            return PlayStrategy._find_beat_straight(hand, count_map, last_pattern.main_rank, last_pattern.length)
        elif last_pattern.type == STRAIGHT_PAIR:
            return PlayStrategy._find_beat_straight_pair(hand, count_map, last_pattern.main_rank, last_pattern.length)
        elif last_pattern.type == BOMB:
            return PlayStrategy._find_beat_bomb(hand, count_map, last_pattern.main_rank)

        return None

    @staticmethod
    def _count_by_rank(hand: List[Card]) -> Dict[str, List[Card]]:
        """按点数分组手牌"""
        groups = {}
        for card in hand:
            if card.rank not in groups:
                groups[card.rank] = []
            groups[card.rank].append(card)
        return groups

    @staticmethod
    def _find_beat_single(hand: List[Card], min_rank: int) -> Optional[List[Card]]:
        """寻找可压上家的最小单张"""
        for card in reversed(hand):  # 从小到大
            if card.rank_order > min_rank:
                return [card]
        return None

    @staticmethod
    def _find_beat_pair(hand: List[Card], count_map: Dict, min_rank: int) -> Optional[List[Card]]:
        """寻找可压上家的最小对子"""
        for rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
            if RANK_ORDER[rank] > min_rank and len(count_map[rank]) >= 2:
                return count_map[rank][:2]
        return None

    @staticmethod
    def _find_beat_triple(hand: List[Card], count_map: Dict, min_rank: int) -> Optional[List[Card]]:
        """寻找可压上家的最小三条"""
        for rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
            if RANK_ORDER[rank] > min_rank and len(count_map[rank]) >= 3:
                return count_map[rank][:3]
        return None

    @staticmethod
    def _find_beat_triple_one(hand: List[Card], count_map: Dict, min_rank: int) -> Optional[List[Card]]:
        """寻找可压上家的最小三带一"""
        for rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
            if RANK_ORDER[rank] > min_rank and len(count_map[rank]) >= 3:
                triple = count_map[rank][:3]
                # 找一张单牌
                for other_rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
                    if other_rank != rank and len(count_map[other_rank]) >= 1:
                        return triple + [count_map[other_rank][0]]
        return None

    @staticmethod
    def _find_beat_triple_two(hand: List[Card], count_map: Dict, min_rank: int) -> Optional[List[Card]]:
        """寻找可压上家的最小三带二"""
        for rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
            if RANK_ORDER[rank] > min_rank and len(count_map[rank]) >= 3:
                triple = count_map[rank][:3]
                # 找一对
                for other_rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
                    if other_rank != rank and len(count_map[other_rank]) >= 2:
                        return triple + count_map[other_rank][:2]
        return None

    @staticmethod
    def _find_beat_straight(hand: List[Card], count_map: Dict, min_main_rank: int, length: int) -> Optional[List[Card]]:
        """寻找可压上家的顺子"""
        # 从最小点数开始尝试
        normal_ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
        for start_idx in range(len(normal_ranks) - length + 1):
            start_rank = normal_ranks[start_idx]
            start_order = RANK_ORDER[start_rank]
            end_order = start_order + length - 1
            # 主牌点数必须大于上家
            if end_order <= min_main_rank:
                continue
            # 检查每个点数是否有牌
            cards = []
            valid = True
            for i in range(length):
                rank = normal_ranks[start_idx + i]
                if rank in count_map and len(count_map[rank]) >= 1:
                    cards.append(count_map[rank][0])
                else:
                    valid = False
                    break
            if valid and len(cards) == length:
                return cards
        return None

    @staticmethod
    def _find_beat_straight_pair(hand: List[Card], count_map: Dict, min_main_rank: int, length: int) -> Optional[List[Card]]:
        """寻找可压上家的连对"""
        normal_ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
        for start_idx in range(len(normal_ranks) - length + 1):
            start_rank = normal_ranks[start_idx]
            start_order = RANK_ORDER[start_rank]
            end_order = start_order + length - 1
            if end_order <= min_main_rank:
                continue
            cards = []
            valid = True
            for i in range(length):
                rank = normal_ranks[start_idx + i]
                if rank in count_map and len(count_map[rank]) >= 2:
                    cards.extend(count_map[rank][:2])
                else:
                    valid = False
                    break
            if valid and len(cards) == length * 2:
                return cards
        return None

    @staticmethod
    def _find_beat_bomb(hand: List[Card], count_map: Dict, min_rank: int) -> Optional[List[Card]]:
        """寻找可压上家的炸弹"""
        for rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
            if RANK_ORDER[rank] > min_rank and len(count_map[rank]) >= 4:
                return count_map[rank][:4]
        # 尝试火箭
        ranks_set = set(count_map.keys())
        if 'SMALL_JOKER' in ranks_set and 'BIG_JOKER' in ranks_set:
            return count_map['SMALL_JOKER'][:1] + count_map['BIG_JOKER'][:1]
        return None

    @staticmethod
    def _try_bomb_or_rocket(hand: List[Card], last_pattern: Optional[Pattern]) -> Optional[List[Card]]:
        """尝试使用炸弹或火箭"""
        count_map = PlayStrategy._count_by_rank(hand)

        # 火箭
        ranks_set = set(count_map.keys())
        if 'SMALL_JOKER' in ranks_set and 'BIG_JOKER' in ranks_set:
            if last_pattern is None or last_pattern.type != ROCKET:
                return count_map['SMALL_JOKER'][:1] + count_map['BIG_JOKER'][:1]

        # 炸弹
        if last_pattern is None or last_pattern.type != ROCKET:
            for rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
                if len(count_map[rank]) >= 4:
                    if last_pattern is None or last_pattern.type != BOMB or RANK_ORDER[rank] > last_pattern.main_rank:
                        return count_map[rank][:4]

        return None

    @staticmethod
    def _should_use_bomb(game_state: GameState, player_id: int) -> bool:
        """判断是否应该使用炸弹
        
        关键时刻：手牌少于5张 或 对手手牌少于3张
        """
        player = game_state.get_player(player_id)
        if player and player.hand_card_count <= 5:
            return True

        # 对手手牌少时使用
        for p in game_state.players:
            if p.id != player_id and p.hand_card_count <= 3:
                return True

        return False

    @staticmethod
    def _find_straight_in_hand(hand: List[Card], count_map: Dict) -> Optional[List[Card]]:
        """在手牌中寻找顺子"""
        normal_ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
        # 从最长的顺子开始找
        for length in range(min(12, len(hand)), 4, -1):
            for start_idx in range(len(normal_ranks) - length + 1):
                cards = []
                valid = True
                for i in range(length):
                    rank = normal_ranks[start_idx + i]
                    if rank in count_map and len(count_map[rank]) >= 1:
                        cards.append(count_map[rank][0])
                    else:
                        valid = False
                        break
                if valid and len(cards) >= 5:
                    return cards
        return None

    @staticmethod
    def _find_straight_pair_in_hand(hand: List[Card], count_map: Dict) -> Optional[List[Card]]:
        """在手牌中寻找连对"""
        normal_ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
        for length in range(min(10, len(hand) // 2), 2, -1):
            for start_idx in range(len(normal_ranks) - length + 1):
                cards = []
                valid = True
                for i in range(length):
                    rank = normal_ranks[start_idx + i]
                    if rank in count_map and len(count_map[rank]) >= 2:
                        cards.extend(count_map[rank][:2])
                    else:
                        valid = False
                        break
                if valid and len(cards) >= 6:
                    return cards
        return None

    @staticmethod
    def _find_triple_with_in_hand(hand: List[Card], count_map: Dict) -> Optional[List[Card]]:
        """在手牌中寻找三带一或三带二"""
        for rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
            if len(count_map[rank]) >= 3 and rank not in ('2', 'SMALL_JOKER', 'BIG_JOKER'):
                triple = count_map[rank][:3]
                # 尝试带一对
                for other_rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
                    if other_rank != rank and len(count_map[other_rank]) >= 2:
                        return triple + count_map[other_rank][:2]
                # 尝试带单牌
                for other_rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
                    if other_rank != rank and len(count_map[other_rank]) >= 1:
                        return triple + [count_map[other_rank][0]]
        return None

    @staticmethod
    def _find_smallest_pair(hand: List[Card], count_map: Dict) -> Optional[List[Card]]:
        """寻找最小对子"""
        for rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
            if len(count_map[rank]) >= 2 and rank not in ('2', 'SMALL_JOKER', 'BIG_JOKER'):
                return count_map[rank][:2]
        # 如果只有大牌对子
        for rank in sorted(count_map.keys(), key=lambda r: RANK_ORDER[r]):
            if len(count_map[rank]) >= 2:
                return count_map[rank][:2]
        return None