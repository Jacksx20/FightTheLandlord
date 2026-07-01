"""牌组管理 - 生成54张标准扑克牌、Fisher-Yates洗牌、发牌分配"""
import random
from typing import List, Tuple
from models.card import Card


# 标准花色
SUITS = ['♠', '♥', '♣', '♦']
# 标准点数（从小到大）
RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']


class Deck:
    """牌组管理类 - 负责生成、洗牌、发牌"""

    @staticmethod
    def create() -> List[Card]:
        """生成54张标准扑克牌
        
        4花色 × 13点数 = 52张常规牌
        小王1张 + 大王1张 = 2张王牌
        
        Returns:
            54张牌的列表，每张牌id全局唯一(1-54)
        """
        cards = []
        card_id = 1

        # 生成52张常规牌
        for suit in SUITS:
            for rank in RANKS:
                cards.append(Card(id=card_id, suit=suit, rank=rank))
                card_id += 1

        # 生成大小王
        cards.append(Card(id=card_id, suit='joker', rank='SMALL_JOKER'))
        card_id += 1
        cards.append(Card(id=card_id, suit='joker', rank='BIG_JOKER'))

        return cards

    @staticmethod
    def shuffle(cards: List[Card]) -> List[Card]:
        """Fisher-Yates洗牌算法 - 产生均匀随机的牌序
        
        Args:
            cards: 待洗牌的牌列表
            
        Returns:
            洗牌后的新牌列表（不修改原列表）
        """
        shuffled = cards.copy()
        n = len(shuffled)
        for i in range(n - 1, 0, -1):
            j = random.randint(0, i)
            shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
        return shuffled

    @staticmethod
    def deal(cards: List[Card]) -> Tuple[List[Card], List[Card], List[Card], List[Card]]:
        """发牌 - 每人17张 + 3张底牌
        
        Args:
            cards: 54张洗好的牌
            
        Returns:
            (玩家0手牌, 玩家1手牌, 玩家2手牌, 底牌)
        """
        player0 = cards[0:17]    # 人类玩家
        player1 = cards[17:34]   # AI左
        player2 = cards[34:51]   # AI右
        hidden = cards[51:54]    # 底牌

        return player0, player1, player2, hidden

    @staticmethod
    def validate(cards: List[Card]) -> bool:
        """校验牌组完整性 - 54张牌全局唯一无重复
        
        Args:
            cards: 待校验的牌列表
            
        Returns:
            True=校验通过, False=校验失败
        """
        if len(cards) != 54:
            return False
        ids = [c.id for c in cards]
        return len(set(ids)) == 54