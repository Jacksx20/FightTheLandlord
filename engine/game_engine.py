"""游戏引擎 - 核心游戏逻辑，驱动状态机流转"""
import time
import random
from typing import Optional, Tuple, List, Dict, Any
from models.card import Card
from models.player import Player
from models.game_state import GameState
from models.pattern import Pattern, BOMB, ROCKET
from models.play_record import PlayRecord, BidRecord
from engine.deck import Deck
from engine.pattern_recognizer import PatternRecognizer
from engine.pattern_comparator import PatternComparator
from engine.rule_validator import RuleValidator
from engine.state_manager import StateManager


class GameEngine:
    """游戏引擎 - 5阶段状态机：IDLE → DEALING → BIDDING → PLAYING → SETTLING"""

    def __init__(self):
        """初始化游戏引擎"""
        self.state_manager = StateManager()

    def new_game(self) -> Dict[str, Any]:
        """创建新游戏 - 洗牌发牌，创建GameState，进入BIDDING
        
        Returns:
            包含游戏ID、玩家信息、底牌、阶段等信息的字典
        """
        # 生成并洗牌
        cards = Deck.create()
        shuffled = Deck.shuffle(cards)

        # 校验牌组完整性
        if not Deck.validate(shuffled):
            # 牌数校验异常，重新洗牌
            shuffled = Deck.shuffle(Deck.create())

        # 发牌
        p0_cards, p1_cards, p2_cards, hidden = Deck.deal(shuffled)

        # 创建玩家
        players = [
            Player(id=0, name="你", hand_cards=list(p0_cards), is_ai=False),
            Player(id=1, name="AI-左", hand_cards=list(p1_cards), is_ai=True),
            Player(id=2, name="AI-右", hand_cards=list(p2_cards), is_ai=True),
        ]

        # 手牌按点数降序排列
        for p in players:
            p.sort_hand()

        # 创建游戏状态
        game_state = GameState(
            phase="bidding",
            players=players,
            hidden_cards=list(hidden),
            current_player=random.randint(0, 2),  # 随机首位叫分玩家
        )

        # 存储状态
        game_id = self.state_manager.create(game_state)

        return {
            'gameId': game_id,
            'players': [p.to_dict() for p in players],
            'hiddenCards': None,  # 叫地主前不公开
            'phase': game_state.phase,
            'currentPlayer': game_state.current_player,
            'bidScore': game_state.bid_score,
        }

    def bid(self, game_id: str, player_id: int, score: int) -> Dict[str, Any]:
        """叫分处理
        
        Args:
            game_id: 游戏ID
            player_id: 叫分玩家ID
            score: 叫分值（0=不叫, 1/2/3=叫分）
            
        Returns:
            叫分结果信息
        """
        game_state = self.state_manager.get(game_id)
        if game_state is None:
            return {'success': False, 'error': '游戏不存在'}

        # 验证阶段
        if game_state.phase != "bidding":
            return {'success': False, 'error': '当前不是叫地主阶段'}

        # 验证是否轮到该玩家
        if game_state.current_player != player_id:
            return {'success': False, 'error': '还没轮到你叫分'}

        # 验证叫分递增
        if score != 0 and score <= game_state.bid_score:
            return {'success': False, 'error': '叫分必须高于当前最高叫分'}

        # 记录叫分历史
        bid_record = BidRecord(player_id=player_id, score=score, timestamp=time.time())
        game_state.bid_history.append(bid_record)
        game_state.bid_count += 1

        is_landlord_settled = False
        landlord_id = None
        hidden_cards = None

        if score == 3:
            # 叫3分直接成为地主
            game_state.bid_score = 3
            game_state.bidder = player_id
            is_landlord_settled = True
            landlord_id = player_id
        elif score == 0:
            # 不叫，轮转到下一位
            pass
        else:
            # 更新最高叫分
            game_state.bid_score = score
            game_state.bidder = player_id

        # 判断是否所有人已叫分
        if game_state.bid_count >= 3:
            if game_state.bidder is None:
                # 全员不叫，重新发牌
                return self._handle_all_pass_bid(game_id, game_state)

            # 最高分者成为地主
            is_landlord_settled = True
            landlord_id = game_state.bidder

        if is_landlord_settled and landlord_id is not None:
            # 确定地主，底牌公开
            self._settle_landlord(game_state, landlord_id)
            hidden_cards = [c.to_dict() for c in game_state.hidden_cards]
            game_state.phase = "playing"
            game_state.current_player = landlord_id  # 地主先出
        else:
            # 轮转到下一位叫分
            game_state.current_player = game_state.next_player_id()

        self.state_manager.update(game_id, game_state)

        result = {
            'success': True,
            'bidScore': game_state.bid_score,
            'bidder': game_state.bidder,
            'isLandlordSettled': is_landlord_settled,
            'nextPlayer': game_state.current_player,
            'phase': game_state.phase,
        }
        if is_landlord_settled:
            result['landlordId'] = landlord_id
            result['hiddenCards'] = hidden_cards
        return result

    def _handle_all_pass_bid(self, game_id: str, game_state: GameState) -> Dict[str, Any]:
        """处理全员不叫的情况 - 重新洗牌发牌"""
        # 重新洗牌发牌
        cards = Deck.create()
        shuffled = Deck.shuffle(cards)
        p0_cards, p1_cards, p2_cards, hidden = Deck.deal(shuffled)

        # 重置玩家手牌
        game_state.players[0].hand_cards = list(p0_cards)
        game_state.players[1].hand_cards = list(p1_cards)
        game_state.players[2].hand_cards = list(p2_cards)
        game_state.hidden_cards = list(hidden)

        for p in game_state.players:
            p.sort_hand()
            p.role = "undefined"
            p.last_play = None

        # 重置叫分状态
        game_state.bid_score = 0
        game_state.bidder = None
        game_state.bid_count = 0
        game_state.bid_history = []
        game_state.current_player = random.randint(0, 2)
        game_state.phase = "bidding"

        self.state_manager.update(game_id, game_state)

        return {
            'success': True,
            'bidScore': 0,
            'bidder': None,
            'isLandlordSettled': False,
            'nextPlayer': game_state.current_player,
            'phase': 'bidding',
            'message': '无人叫地主，重新发牌',
            'players': [p.to_dict() for p in game_state.players],
        }

    def _settle_landlord(self, game_state: GameState, landlord_id: int) -> None:
        """确定地主 - 底牌归入地主手牌，设置角色"""
        # 设置角色
        for p in game_state.players:
            if p.id == landlord_id:
                p.role = "landlord"
                # 底牌归入地主手牌
                p.hand_cards.extend(game_state.hidden_cards)
                p.sort_hand()
            else:
                p.role = "farmer"

    def play(self, game_id: str, player_id: int, cards: List[Card]) -> Dict[str, Any]:
        """出牌处理
        
        Args:
            game_id: 游戏ID
            player_id: 出牌玩家ID
            cards: 出的牌列表
            
        Returns:
            出牌结果信息
        """
        game_state = self.state_manager.get(game_id)
        if game_state is None:
            return {'success': False, 'error': '游戏不存在'}

        # 验证出牌合法性
        valid, pattern, error = RuleValidator.validate(cards, game_state, player_id)
        if not valid:
            return {'success': False, 'error': error}

        # 获取玩家并扣除手牌
        player = game_state.get_player(player_id)
        player.remove_cards(cards)
        player.last_play = list(cards)

        # 更新出牌区
        game_state.last_play = list(cards)
        game_state.last_play_by = player_id
        game_state.last_play_pattern = pattern.type
        game_state.pass_count = 0  # 出牌后重置过牌计数

        # 炸弹/火箭翻倍
        is_bomb = pattern.type in (BOMB, ROCKET)
        if is_bomb:
            game_state.multiplier *= 2
            game_state.bomb_count += 1

        # 记录出牌历史
        play_record = PlayRecord(
            player_id=player_id,
            cards=list(cards),
            pattern_type=pattern.type,
            is_pass=False,
            timestamp=time.time()
        )
        game_state.play_history.append(play_record)

        # 检测胜负
        winner = self._check_winner(game_state)
        if winner is not None:
            game_state.phase = "settling"
            game_state.current_player = player_id
        else:
            # 轮转到下一位
            game_state.current_player = game_state.next_player_id()

        self.state_manager.update(game_id, game_state)

        result = {
            'success': True,
            'pattern': pattern.to_dict() if pattern else None,
            'isBomb': is_bomb,
            'multiplier': game_state.multiplier,
            'nextPlayer': game_state.current_player,
            'phase': game_state.phase,
            'handCards': [c.to_dict() for c in player.hand_cards],
            'handCardCount': player.hand_card_count,
        }
        if winner is not None:
            result['winnerId'] = winner
        return result

    def pass_turn(self, game_id: str, player_id: int) -> Dict[str, Any]:
        """过牌处理
        
        Args:
            game_id: 游戏ID
            player_id: 过牌玩家ID
            
        Returns:
            过牌结果信息
        """
        game_state = self.state_manager.get(game_id)
        if game_state is None:
            return {'success': False, 'error': '游戏不存在'}

        # 验证是否可以过牌
        can_pass, error = RuleValidator.can_pass(game_state, player_id)
        if not can_pass:
            return {'success': False, 'error': error}

        # 更新过牌状态
        player = game_state.get_player(player_id)
        player.last_play = None  # 过牌清空最近出牌
        game_state.pass_count += 1

        # 记录过牌历史
        play_record = PlayRecord(
            player_id=player_id,
            cards=[],
            pattern_type=None,
            is_pass=True,
            timestamp=time.time()
        )
        game_state.play_history.append(play_record)

        # 判断自由出牌权
        is_free_play = game_state.is_free_play

        # 轮转到下一位
        next_id = game_state.next_player_id()
        game_state.current_player = next_id

        # 如果下一位获得自由出牌权，重置出牌区
        if is_free_play:
            game_state.last_play = None
            game_state.last_play_by = None
            game_state.last_play_pattern = None
            game_state.pass_count = 0

        self.state_manager.update(game_id, game_state)

        return {
            'success': True,
            'passCount': game_state.pass_count,
            'nextPlayer': game_state.current_player,
            'isFreePlay': is_free_play,
            'phase': game_state.phase,
        }

    def settle(self, game_id: str) -> Dict[str, Any]:
        """结算计算
        
        计算规则：得分 = 底分 × 叫分 × 倍数
        
        Returns:
            结算结果信息
        """
        game_state = self.state_manager.get(game_id)
        if game_state is None:
            return {'success': False, 'error': '游戏不存在'}

        if game_state.phase != "settling":
            return {'success': False, 'error': '当前不是结算阶段'}

        # 确定胜方
        winner_id = self._check_winner(game_state)
        if winner_id is None:
            return {'success': False, 'error': '游戏尚未结束'}

        winner_player = game_state.get_player(winner_id)
        is_landlord_win = winner_player.is_landlord

        # 计算得分
        base_score = 100  # 底分
        bid_score = max(game_state.bid_score, 1)  # 至少1分
        multiplier = game_state.multiplier
        total_score = base_score * bid_score * multiplier

        # 分配得分
        scores = {}
        for p in game_state.players:
            if p.is_landlord:
                scores[p.id] = total_score if is_landlord_win else -total_score
            else:
                scores[p.id] = total_score if not is_landlord_win else -total_score

        return {
            'success': True,
            'winner': 'landlord' if is_landlord_win else 'farmer',
            'winnerId': winner_id,
            'baseScore': base_score,
            'bidScore': bid_score,
            'multiplier': multiplier,
            'totalScore': total_score,
            'scores': scores,
            'bombCount': game_state.bomb_count,
        }

    def get_state(self, game_id: str) -> Optional[Dict[str, Any]]:
        """获取游戏状态"""
        game_state = self.state_manager.get(game_id)
        if game_state is None:
            return None
        return game_state.to_dict()

    def _check_winner(self, game_state: GameState) -> Optional[int]:
        """检测胜负 - 某玩家手牌为0则游戏结束
        
        Returns:
            胜利玩家ID，None表示游戏继续
        """
        for p in game_state.players:
            if p.hand_card_count == 0:
                return p.id
        return None