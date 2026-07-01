"""AI决策API路由 - 处理AI叫分、出牌、提示等HTTP请求"""
from flask import Blueprint, request, jsonify
from models.card import Card
from ai.bid_strategy import BidStrategy
from ai.play_strategy import PlayStrategy
from api.game_routes import get_game_engine

# 创建蓝图
ai_bp = Blueprint('ai', __name__)


def _make_response(code=200, data=None, message="success"):
    """统一响应格式"""
    return jsonify({'code': code, 'data': data, 'message': message}), code


@ai_bp.route('/api/game/<game_id>/ai-bid', methods=['POST'])
def ai_bid(game_id):
    """AI叫分决策 - 根据手牌强度自动决策叫分
    
    请求体: {playerId: int}
    
    决策规则：
    - 手牌强度评分 >= 10 → 叫3分
    - 手牌强度评分 >= 7 → 叫2分
    - 手牌强度评分 >= 4 → 叫1分
    - 手牌强度评分 < 4 → 不叫
    """
    try:
        data = request.get_json()
        player_id = data.get('playerId')

        if player_id is None:
            return _make_response(code=400, message="缺少playerId参数")

        # 获取游戏引擎和游戏状态
        engine = get_game_engine()
        game_state = engine.state_manager.get(game_id)
        if game_state is None:
            return _make_response(code=404, message="游戏不存在")

        # 验证阶段
        if game_state.phase != "bidding":
            return _make_response(code=400, message="当前不是叫地主阶段")

        # 验证是否轮到该玩家
        if game_state.current_player != player_id:
            return _make_response(code=400, message="还没轮到该玩家叫分")

        # 获取AI玩家手牌
        player = game_state.get_player(player_id)
        if player is None:
            return _make_response(code=404, message="玩家不存在")

        if not player.is_ai:
            return _make_response(code=400, message="该玩家不是AI玩家")

        # 调用叫分策略获取决策
        score = BidStrategy.decide(player.hand_cards, game_state.bid_score)

        # 执行叫分
        result = engine.bid(game_id, player_id, score)
        if not result.get('success', True):
            return _make_response(data=result, message=result.get('error', 'AI叫分失败'))

        # 附加AI决策信息
        result['aiDecision'] = score
        return _make_response(data=result)

    except Exception as e:
        return _make_response(code=500, message=f"AI叫分决策失败: {str(e)}")


@ai_bp.route('/api/game/<game_id>/ai-play', methods=['POST'])
def ai_play(game_id):
    """AI出牌决策 - 根据手牌和游戏状态自动决策出牌
    
    请求体: {playerId: int}
    
    决策策略：
    - 自由出牌：优先出小牌保留大牌
    - 跟牌：寻找同类型最小可压牌型
    - 队友配合：农民AI识别队友优先过牌
    - 炸弹压制：关键时刻使用炸弹
    """
    try:
        data = request.get_json()
        player_id = data.get('playerId')

        if player_id is None:
            return _make_response(code=400, message="缺少playerId参数")

        # 获取游戏引擎和游戏状态
        engine = get_game_engine()
        game_state = engine.state_manager.get(game_id)
        if game_state is None:
            return _make_response(code=404, message="游戏不存在")

        # 验证阶段
        if game_state.phase != "playing":
            return _make_response(code=400, message="当前不是出牌阶段")

        # 验证是否轮到该玩家
        if game_state.current_player != player_id:
            return _make_response(code=400, message="还没轮到该玩家出牌")

        # 获取AI玩家手牌
        player = game_state.get_player(player_id)
        if player is None:
            return _make_response(code=404, message="玩家不存在")

        if not player.is_ai:
            return _make_response(code=400, message="该玩家不是AI玩家")

        # 调用出牌策略获取决策
        decision = PlayStrategy.decide(player.hand_cards, game_state, player_id)

        # 根据决策执行出牌或过牌
        if decision['action'] == 'play' and decision['cards']:
            # AI出牌
            result = engine.play(game_id, player_id, decision['cards'])
            if not result.get('success', True):
                return _make_response(data=result, message=result.get('error', 'AI出牌失败'))
            # 附加AI决策信息
            result['aiAction'] = 'play'
            result['aiPattern'] = decision['pattern'].to_dict() if decision['pattern'] else None
        else:
            # AI过牌
            result = engine.pass_turn(game_id, player_id)
            if not result.get('success', True):
                return _make_response(data=result, message=result.get('error', 'AI过牌失败'))
            # 附加AI决策信息
            result['aiAction'] = 'pass'

        return _make_response(data=result)

    except Exception as e:
        return _make_response(code=500, message=f"AI出牌决策失败: {str(e)}")


@ai_bp.route('/api/game/<game_id>/hint', methods=['POST'])
def hint(game_id):
    """出牌提示 - 为人类玩家提供出牌建议
    
    请求体: {playerId: int}
    
    返回建议出的牌列表，无合法出牌时返回空
    """
    try:
        data = request.get_json()
        player_id = data.get('playerId')

        if player_id is None:
            return _make_response(code=400, message="缺少playerId参数")

        # 获取游戏引擎和游戏状态
        engine = get_game_engine()
        game_state = engine.state_manager.get(game_id)
        if game_state is None:
            return _make_response(code=404, message="游戏不存在")

        # 验证阶段
        if game_state.phase != "playing":
            return _make_response(code=400, message="当前不是出牌阶段")

        # 获取玩家手牌
        player = game_state.get_player(player_id)
        if player is None:
            return _make_response(code=404, message="玩家不存在")

        # 调用出牌提示策略
        suggested_cards = PlayStrategy.hint(player.hand_cards, game_state, player_id)

        if suggested_cards is None:
            # 无合法出牌，建议过牌
            return _make_response(data={
                'hasHint': False,
                'cards': [],
                'message': '没有可出的牌，建议过牌'
            })

        # 序列化建议牌
        return _make_response(data={
            'hasHint': True,
            'cards': [c.to_dict() for c in suggested_cards],
            'message': '已为您找到出牌建议'
        })

    except Exception as e:
        return _make_response(code=500, message=f"出牌提示失败: {str(e)}")