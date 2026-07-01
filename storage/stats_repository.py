"""战绩持久化存储 - JSON文件读写"""
import json
import os
from typing import Optional
from models.statistics import Statistics
from models.settings import GameSettings


# 数据目录
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
STATS_FILE = os.path.join(DATA_DIR, 'stats.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')


class StatsRepository:
    """战绩持久化存储 - 读写JSON文件"""

    @staticmethod
    def get_stats() -> Statistics:
        """读取战绩数据"""
        if not os.path.exists(STATS_FILE):
            return Statistics()
        try:
            with open(STATS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return Statistics(
                total_games=data.get('totalGames', 0),
                total_wins=data.get('totalWins', 0),
                landlord_games=data.get('landlordGames', 0),
                landlord_wins=data.get('landlordWins', 0),
                farmer_games=data.get('farmerGames', 0),
                farmer_wins=data.get('farmerWins', 0),
                total_score=data.get('totalScore', 0),
            )
        except (json.JSONDecodeError, IOError):
            return Statistics()

    @staticmethod
    def save_stats(stats: Statistics) -> bool:
        """保存战绩数据"""
        os.makedirs(DATA_DIR, exist_ok=True)
        try:
            with open(STATS_FILE, 'w', encoding='utf-8') as f:
                json.dump(stats.to_dict(), f, ensure_ascii=False, indent=2)
            return True
        except IOError:
            return False

    @staticmethod
    def update_stats(result: str, role: str, score: int) -> Statistics:
        """更新战绩数据
        
        Args:
            result: 胜负结果 win/lose
            role: 角色 landlord/farmer
            score: 得分
        """
        stats = StatsRepository.get_stats()
        stats.total_games += 1
        stats.total_score += score

        if result == 'win':
            stats.total_wins += 1
            if role == 'landlord':
                stats.landlord_wins += 1
            else:
                stats.farmer_wins += 1
        else:
            if role == 'landlord':
                pass  # 地主失败不增加胜局
            else:
                pass  # 农民失败不增加胜局

        if role == 'landlord':
            stats.landlord_games += 1
        else:
            stats.farmer_games += 1

        StatsRepository.save_stats(stats)
        return stats

    @staticmethod
    def reset_stats() -> bool:
        """重置战绩数据"""
        stats = Statistics()
        return StatsRepository.save_stats(stats)

    @staticmethod
    def get_settings() -> GameSettings:
        """读取游戏设置"""
        if not os.path.exists(SETTINGS_FILE):
            return GameSettings()
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return GameSettings.from_dict(data)
        except (json.JSONDecodeError, IOError):
            return GameSettings()

    @staticmethod
    def save_settings(settings: GameSettings) -> bool:
        """保存游戏设置"""
        os.makedirs(DATA_DIR, exist_ok=True)
        try:
            with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(settings.to_dict(), f, ensure_ascii=False, indent=2)
            return True
        except IOError:
            return False