"""游戏状态模型 - 表示一局游戏的完整状态"""
from dataclasses import dataclass, field
from typing import List, Optional
from .card import Card
from .player import Player
from .play_record import PlayRecord, BidRecord


@dataclass
class GameState:
    """游戏状态数据模型
    
    Attributes:
        game_id: 游戏唯一标识
        phase: 阶段 idle/dealing/bidding/playing/settling
        players: 三位玩家
        hidden_cards: 底牌
        current_player: 当前操作玩家ID
        bid_score: 当前最高叫分
        bidder: 当前最高叫分玩家ID
        last_play: 上一次有效出牌的牌
        last_play_by: 上一次有效出牌玩家ID
        last_play_pattern: 上一次出牌牌型
        pass_count: 连续过牌次数
        multiplier: 当前倍数
        bomb_count: 炸弹/火箭次数
        play_history: 出牌历史
        bid_history: 叫分历史
        bid_count: 已叫分玩家数
    """
    game_id: str = ""
    phase: str = "idle"
    players: List[Player] = field(default_factory=list)
    hidden_cards: List[Card] = field(default_factory=list)
    current_player: int = 0
    bid_score: int = 0
    bidder: Optional[int] = None
    last_play: Optional[List[Card]] = None
    last_play_by: Optional[int] = None
    last_play_pattern: Optional[str] = None
    pass_count: int = 0
    multiplier: int = 1
    bomb_count: int = 0
    play_history: List[PlayRecord] = field(default_factory=list)
    bid_history: List[BidRecord] = field(default_factory=list)
    bid_count: int = 0

    @property
    def is_free_play(self) -> bool:
        """当前玩家是否拥有自由出牌权（连续两人过牌）"""
        return self.pass_count >= 2

    def get_player(self, player_id: int) -> Optional[Player]:
        """根据ID获取玩家"""
        for p in self.players:
            if p.id == player_id:
                return p
        return None

    def get_current_player(self) -> Optional[Player]:
        """获取当前操作玩家"""
        return self.get_player(self.current_player)

    def get_landlord(self) -> Optional[Player]:
        """获取地主玩家"""
        for p in self.players:
            if p.role == "landlord":
                return p
        return None

    def get_farmers(self) -> List[Player]:
        """获取所有农民玩家"""
        return [p for p in self.players if p.role == "farmer"]

    def next_player_id(self, current_id: int = None) -> int:
        """获取下一位玩家ID"""
        cid = current_id if current_id is not None else self.current_player
        return (cid + 1) % len(self.players)

    def to_dict(self, hide_ai_cards: bool = True) -> dict:
        """序列化为字典
        
        Args:
            hide_ai_cards: 是否隐藏AI手牌详情
        """
        result = {
            'gameId': self.game_id,
            'phase': self.phase,
            'currentPlayer': self.current_player,
            'bidScore': self.bid_score,
            'bidder': self.bidder,
            'passCount': self.pass_count,
            'multiplier': self.multiplier,
            'bombCount': self.bomb_count,
            'isFreePlay': self.is_free_play,
            'bidCount': self.bid_count,
        }
        # 玩家信息
        result['players'] = []
        for p in self.players:
            hide = hide_ai_cards and p.is_ai
            result['players'].append(p.to_dict(hide_cards=hide))
        # 底牌：叫地主前不公开
        if self.phase in ('playing', 'settling'):
            result['hiddenCards'] = [c.to_dict() for c in self.hidden_cards]
        else:
            result['hiddenCards'] = None
        # 上一次出牌
        if self.last_play is not None:
            result['lastPlay'] = [c.to_dict() for c in self.last_play]
            result['lastPlayBy'] = self.last_play_by
            result['lastPlayPattern'] = self.last_play_pattern
        else:
            result['lastPlay'] = None
            result['lastPlayBy'] = None
            result['lastPlayPattern'] = None
        return result