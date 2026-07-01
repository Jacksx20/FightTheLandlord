"""游戏API路由 - 处理游戏核心操作的HTTP请求"""
from flask import Blueprint, request, jsonify
from models.card import Card
from engine.game_engine import GameEngine

# 创建蓝图
game_bp = Blueprint('game', __name__)

# 全局游戏引擎实例
game_engine = GameEngine()


def _make_response(code=200, data=None, message="success"):
    """统一响应格式"""
    return jsonify({'code': code, 'data': data, 'message': message}), code


@game_bp.route('/api/game/new', methods=['POST'])
def new_game():
    """创建新游戏 - 洗牌发牌，进入叫地主阶段"""
    try:
        result = game_engine.new_game()
        return _make_response(data=result)
    except Exception as e:
        return _make_response(code=500, message=f"创建游戏失败: {str(e)}")


@game_bp.route('/api/game/<game_id>/bid', methods=['POST'])
def bid(game_id):
    """玩家叫分
    
    请求体: {playerId: int, score: int}
    score: 0=不叫, 1/2/3=叫分
    """
    try:
        data = request.get_json()
        player_id = data.get('playerId')
        score = data.get('score', 0)

        if player_id is None:
            return _make_response(code=400, message="缺少playerId参数")

        result = game_engine.bid(game_id, player_id, score)
        if not result.get('success', True):
            return _make_response(data=result, message=result.get('error', '叫分失败'))
        return _make_response(data=result)
    except Exception as e:
        return _make_response(code=500, message=f"叫分处理失败: {str(e)}")


@game_bp.route('/api/game/<game_id>/play', methods=['POST'])
def play(game_id):
    """玩家出牌
    
    请求体: {playerId: int, cards: [{id, suit, rank, faceUp}]}
    """
    try:
        data = request.get_json()
        player_id = data.get('playerId')
        cards_data = data.get('cards', [])

        if player_id is None:
            return _make_response(code=400, message="缺少playerId参数")

        # 反序列化牌数据
        cards = [Card.from_dict(c) for c in cards_data]

        result = game_engine.play(game_id, player_id, cards)
        if not result.get('success', True):
            return _make_response(data=result, message=result.get('error', '出牌失败'))
        return _make_response(data=result)
    except Exception as e:
        return _make_response(code=500, message=f"出牌处理失败: {str(e)}")


@game_bp.route('/api/game/<game_id>/pass', methods=['POST'])
def pass_turn(game_id):
    """玩家过牌
    
    请求体: {playerId: int}
    """
    try:
        data = request.get_json()
        player_id = data.get('playerId')

        if player_id is None:
            return _make_response(code=400, message="缺少playerId参数")

        result = game_engine.pass_turn(game_id, player_id)
        if not result.get('success', True):
            return _make_response(data=result, message=result.get('error', '过牌失败'))
        return _make_response(data=result)
    except Exception as e:
        return _make_response(code=500, message=f"过牌处理失败: {str(e)}")


@game_bp.route('/api/game/<game_id>/state', methods=['GET'])
def get_state(game_id):
    """获取游戏状态"""
    try:
        state = game_engine.get_state(game_id)
        if state is None:
            return _make_response(code=404, message="游戏不存在")
        return _make_response(data=state)
    except Exception as e:
        return _make_response(code=500, message=f"获取状态失败: {str(e)}")


@game_bp.route('/api/game/<game_id>/settle', methods=['GET'])
def settle(game_id):
    """获取结算结果"""
    try:
        result = game_engine.settle(game_id)
        if not result.get('success', True):
            return _make_response(data=result, message=result.get('error', '结算失败'))
        return _make_response(data=result)
    except Exception as e:
        return _make_response(code=500, message=f"结算处理失败: {str(e)}")


def get_game_engine() -> GameEngine:
    """获取全局游戏引擎实例（供其他模块使用）"""
    return game_engine