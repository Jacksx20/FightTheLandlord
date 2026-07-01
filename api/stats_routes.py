"""战绩与设置API路由 - 处理战绩统计和游戏设置的HTTP请求"""
from flask import Blueprint, request, jsonify
from storage.stats_repository import StatsRepository

# 创建蓝图
stats_bp = Blueprint('stats', __name__)


def _make_response(code=200, data=None, message="success"):
    """统一响应格式"""
    return jsonify({'code': code, 'data': data, 'message': message}), code


@stats_bp.route('/api/stats', methods=['GET'])
def get_stats():
    """获取战绩统计 - 返回玩家历史战绩数据
    
    返回数据包含：
    - 总局数、总胜局、总胜率
    - 地主局数、地主胜局、地主胜率
    - 农民局数、农民胜局、农民胜率
    - 累计得分
    """
    try:
        stats = StatsRepository.get_stats()
        return _make_response(data=stats.to_dict())
    except Exception as e:
        return _make_response(code=500, message=f"获取战绩失败: {str(e)}")


@stats_bp.route('/api/stats', methods=['POST'])
def update_stats():
    """上报本局战绩 - 记录一局游戏的结果
    
    请求体: {result: str, role: str, score: int}
    - result: 胜负结果 win/lose
    - role: 角色 landlord/farmer
    - score: 得分（正数）
    """
    try:
        data = request.get_json()

        # 参数校验
        result = data.get('result')
        role = data.get('role')
        score = data.get('score', 0)

        if result not in ('win', 'lose'):
            return _make_response(code=400, message="result参数必须为win或lose")

        if role not in ('landlord', 'farmer'):
            return _make_response(code=400, message="role参数必须为landlord或farmer")

        if not isinstance(score, int):
            return _make_response(code=400, message="score参数必须为整数")

        # 更新战绩
        stats = StatsRepository.update_stats(result, role, score)
        return _make_response(data=stats.to_dict())

    except Exception as e:
        return _make_response(code=500, message=f"上报战绩失败: {str(e)}")


@stats_bp.route('/api/stats/reset', methods=['DELETE'])
def reset_stats():
    """重置战绩 - 清空所有历史战绩数据"""
    try:
        success = StatsRepository.reset_stats()
        if success:
            return _make_response(data={'reset': True}, message="战绩已重置")
        else:
            return _make_response(code=500, message="重置战绩失败")
    except Exception as e:
        return _make_response(code=500, message=f"重置战绩失败: {str(e)}")


@stats_bp.route('/api/settings', methods=['GET'])
def get_settings():
    """获取游戏设置 - 返回当前游戏配置参数
    
    返回数据包含：
    - soundEnabled: 音效开关
    - baseScore: 底分
    - countdown: 倒计时时长(秒), 0=无限制
    """
    try:
        settings = StatsRepository.get_settings()
        return _make_response(data=settings.to_dict())
    except Exception as e:
        return _make_response(code=500, message=f"获取设置失败: {str(e)}")


@stats_bp.route('/api/settings', methods=['PUT'])
def update_settings():
    """更新游戏设置 - 修改游戏配置参数
    
    请求体: {soundEnabled: bool, baseScore: int, countdown: int}
    - soundEnabled: 音效开关
    - baseScore: 底分（正整数）
    - countdown: 倒计时时长(秒), 0=无限制
    """
    try:
        data = request.get_json()

        # 读取当前设置作为基础
        settings = StatsRepository.get_settings()

        # 逐字段更新（仅更新传入的字段）
        if 'soundEnabled' in data:
            if not isinstance(data['soundEnabled'], bool):
                return _make_response(code=400, message="soundEnabled必须为布尔值")
            settings.sound_enabled = data['soundEnabled']

        if 'baseScore' in data:
            if not isinstance(data['baseScore'], int) or data['baseScore'] <= 0:
                return _make_response(code=400, message="baseScore必须为正整数")
            settings.base_score = data['baseScore']

        if 'countdown' in data:
            if not isinstance(data['countdown'], int) or data['countdown'] < 0:
                return _make_response(code=400, message="countdown必须为非负整数")
            settings.countdown = data['countdown']

        # 保存设置
        success = StatsRepository.save_settings(settings)
        if success:
            return _make_response(data=settings.to_dict(), message="设置已更新")
        else:
            return _make_response(code=500, message="保存设置失败")

    except Exception as e:
        return _make_response(code=500, message=f"更新设置失败: {str(e)}")