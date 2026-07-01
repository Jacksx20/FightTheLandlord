"""规则验证器 - 出牌合法性综合验证"""
from typing import List, Optional, Tuple
from models.card import Card
from models.game_state import GameState
from models.pattern import Pattern
from engine.pattern_recognizer import PatternRecognizer
from engine.pattern_comparator import PatternComparator


class RuleValidator:
    """规则验证器 - 验证出牌的合法性"""

    @staticmethod
    def validate(cards: List[Card], game_state: GameState, player_id: int) -> Tuple[bool, Optional[Pattern], str]:
        """验证出牌合法性
        
        验证流程：
        1. 验证是否轮到该玩家出牌
        2. 验证手牌中是否包含所选牌
        3. 验证牌型合法性（调用PatternRecognizer）
        4. 验证牌型大小是否可压上家（调用PatternComparator）
        5. 验证自由出牌权/过牌约束
        
        Args:
            cards: 玩家选择的牌
            game_state: 当前游戏状态
            player_id: 出牌玩家ID
            
        Returns:
            (是否合法, 识别出的牌型, 错误原因)
        """
        # 1. 验证是否轮到该玩家出牌
        if game_state.current_player != player_id:
            return False, None, "还没轮到你出牌"

        # 2. 验证游戏阶段
        if game_state.phase != "playing":
            return False, None, "当前不是出牌阶段"

        # 3. 验证是否选择了牌
        if not cards:
            return False, None, "请选择要出的牌"

        # 4. 验证手牌中是否包含所选牌
        player = game_state.get_player(player_id)
        if player is None:
            return False, None, "玩家不存在"
        if not player.has_cards(cards):
            return False, None, "选择的牌不在手牌中"

        # 5. 识别牌型
        pattern = PatternRecognizer.recognize(cards)
        if pattern is None:
            return False, None, "不合法的出牌组合"

        # 6. 验证牌型大小是否可压上家
        if game_state.is_free_play:
            # 自由出牌权，可出任意合法牌型
            return True, pattern, ""

        # 需要压上家出牌
        if game_state.last_play is not None and game_state.last_play_pattern is not None:
            # 构造上家牌型用于比较
            last_pattern = Pattern(
                type=game_state.last_play_pattern,
                main_rank=0,  # 需要从上家出牌中识别
                length=0,
                cards=[]
            )
            # 重新识别上家出牌的牌型
            last_recognized = PatternRecognizer.recognize(game_state.last_play)
            if last_recognized is not None:
                if not PatternComparator.can_beat(pattern, last_recognized):
                    return False, None, "出的牌不够大"

        return True, pattern, ""

    @staticmethod
    def can_pass(game_state: GameState, player_id: int) -> Tuple[bool, str]:
        """验证是否可以过牌
        
        规则：
        - 自由出牌权时不可过牌
        - 首出时不可过牌
        
        Args:
            game_state: 当前游戏状态
            player_id: 玩家ID
            
        Returns:
            (是否可以过牌, 错误原因)
        """
        # 验证是否轮到该玩家
        if game_state.current_player != player_id:
            return False, "还没轮到你操作"

        # 验证游戏阶段
        if game_state.phase != "playing":
            return False, "当前不是出牌阶段"

        # 自由出牌权时不可过牌
        if game_state.is_free_play:
            return False, "自由出牌权，必须出牌"

        # 上家没有出牌（首出），不可过牌
        if game_state.last_play is None:
            return False, "必须出牌"

        return True, ""