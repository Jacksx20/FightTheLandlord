"""游戏设置模型 - 用户可配置的游戏参数"""
from dataclasses import dataclass


@dataclass
class GameSettings:
    """游戏设置数据模型
    
    Attributes:
        sound_enabled: 音效开关
        base_score: 底分
        countdown: 倒计时时长(秒), 0=无限制
    """
    sound_enabled: bool = True
    base_score: int = 100
    countdown: int = 30

    def to_dict(self) -> dict:
        """序列化为字典"""
        return {
            'soundEnabled': self.sound_enabled,
            'baseScore': self.base_score,
            'countdown': self.countdown,
        }

    @staticmethod
    def from_dict(data: dict) -> 'GameSettings':
        """从字典反序列化"""
        return GameSettings(
            sound_enabled=data.get('soundEnabled', True),
            base_score=data.get('baseScore', 100),
            countdown=data.get('countdown', 30),
        )