"""战绩统计模型 - 记录玩家历史战绩"""
from dataclasses import dataclass


@dataclass
class Statistics:
    """战绩统计数据模型
    
    Attributes:
        total_games: 总局数
        total_wins: 总胜局
        landlord_games: 地主局数
        landlord_wins: 地主胜局
        farmer_games: 农民局数
        farmer_wins: 农民胜局
        total_score: 累计得分
    """
    total_games: int = 0
    total_wins: int = 0
    landlord_games: int = 0
    landlord_wins: int = 0
    farmer_games: int = 0
    farmer_wins: int = 0
    total_score: int = 0

    @property
    def win_rate(self) -> float:
        """总胜率"""
        return round(self.total_wins / self.total_games, 3) if self.total_games > 0 else 0.0

    @property
    def landlord_win_rate(self) -> float:
        """地主胜率"""
        return round(self.landlord_wins / self.landlord_games, 3) if self.landlord_games > 0 else 0.0

    @property
    def farmer_win_rate(self) -> float:
        """农民胜率"""
        return round(self.farmer_wins / self.farmer_games, 3) if self.farmer_games > 0 else 0.0

    def to_dict(self) -> dict:
        """序列化为字典"""
        return {
            'totalGames': self.total_games,
            'totalWins': self.total_wins,
            'landlordGames': self.landlord_games,
            'landlordWins': self.landlord_wins,
            'farmerGames': self.farmer_games,
            'farmerWins': self.farmer_wins,
            'totalScore': self.total_score,
            'winRate': self.win_rate,
            'landlordWinRate': self.landlord_win_rate,
            'farmerWinRate': self.farmer_win_rate,
        }