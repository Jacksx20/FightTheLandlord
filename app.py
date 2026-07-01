"""斗地主游戏 - Flask应用入口"""
from flask import Flask, send_from_directory
from flask_cors import CORS
from api.game_routes import game_bp
from api.ai_routes import ai_bp
from api.stats_routes import stats_bp
import os


def create_app():
    """创建Flask应用"""
    app = Flask(__name__, static_folder='static', static_url_path='')
    CORS(app)

    # 注册蓝图
    app.register_blueprint(game_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(stats_bp)

    # 首页路由
    @app.route('/')
    def index():
        return send_from_directory('static', 'index.html')

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)