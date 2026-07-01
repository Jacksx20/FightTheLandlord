"""状态管理器 - 游戏状态内存管理与一致性校验"""
import time
from typing import Optional, Dict
from models.game_state import GameState


class StateManager:
    """游戏状态内存管理器 - 管理所有活跃游戏的状态"""

    def __init__(self):
        """初始化状态管理器"""
        self._states: Dict[str, GameState] = {}

    def generate_game_id(self) -> str:
        """生成唯一游戏ID
        
        格式：game_{timestamp}
        """
        return f"game_{int(time.time() * 1000)}"

    def create(self, game_state: GameState) -> str:
        """创建并存储新的游戏状态
        
        Args:
            game_state: 游戏状态对象
            
        Returns:
            游戏ID
        """
        game_id = self.generate_game_id()
        game_state.game_id = game_id
        self._states[game_id] = game_state
        return game_id

    def get(self, game_id: str) -> Optional[GameState]:
        """获取游戏状态
        
        Args:
            game_id: 游戏ID
            
        Returns:
            游戏状态，不存在返回None
        """
        return self._states.get(game_id)

    def update(self, game_id: str, game_state: GameState) -> bool:
        """更新游戏状态
        
        Args:
            game_id: 游戏ID
            game_state: 新的游戏状态
            
        Returns:
            更新是否成功
        """
        if game_id not in self._states:
            return False
        self._states[game_id] = game_state
        return True

    def delete(self, game_id: str) -> bool:
        """删除游戏状态
        
        Args:
            game_id: 游戏ID
            
        Returns:
            删除是否成功
        """
        if game_id in self._states:
            del self._states[game_id]
            return True
        return False

    def validate(self, game_state: GameState) -> bool:
        """状态一致性校验
        
        校验内容：
        1. 玩家数量为3
        2. 所有牌ID全局唯一
        3. 状态阶段合法
        
        Args:
            game_state: 待校验的游戏状态
            
        Returns:
            校验是否通过
        """
        # 校验玩家数量
        if len(game_state.players) != 3:
            return False

        # 校验所有牌ID唯一
        all_card_ids = set()
        for player in game_state.players:
            for card in player.hand_cards:
                if card.id in all_card_ids:
                    return False
                all_card_ids.add(card.id)
        for card in game_state.hidden_cards:
            if card.id in all_card_ids:
                return False
            all_card_ids.add(card.id)

        # 校验阶段合法
        valid_phases = {'idle', 'dealing', 'bidding', 'playing', 'settling'}
        if game_state.phase not in valid_phases:
            return False

        return True

    def get_all_game_ids(self) -> list:
        """获取所有活跃游戏ID"""
        return list(self._states.keys())