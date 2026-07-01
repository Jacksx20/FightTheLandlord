/**
 * ============================================
 * 斗地主游戏 - API客户端封装
 * 统一管理所有后端API请求
 * ============================================
 */

class ApiClient {
    /**
     * 构造函数
     * @param {string} baseURL - API基础URL
     */
    constructor(baseURL = 'http://localhost:5000') {
        this.baseURL = baseURL;
        // 请求超时时间（毫秒）
        this.timeout = 10000;
        // 当前游戏ID
        this.gameId = null;
    }

    /**
     * 设置当前游戏ID
     * @param {string} gameId - 游戏ID
     */
    setGameId(gameId) {
        this.gameId = gameId;
    }

    /**
     * 通用请求方法
     * @param {string} method - HTTP方法
     * @param {string} path - 请求路径
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} 响应数据 {success, data, error}
     */
    async request(method, path, data = null) {
        const url = `${this.baseURL}${path}`;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        // GET/DELETE不携带body
        if (data && !['GET', 'DELETE'].includes(method)) {
            options.body = JSON.stringify(data);
        }

        try {
            // 超时控制
            const controller = new AbortController();
            options.signal = controller.signal;
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            // 解析JSON响应
            const result = await response.json();

            // HTTP状态码检查
            if (!response.ok) {
                console.error(`[API] 请求失败: ${method} ${path}`, result);
                return {
                    success: false,
                    error: result.error || result.message || `请求失败(${response.status})`,
                    data: null
                };
            }

            return { success: true, data: result, error: null };

        } catch (error) {
            // 超时
            if (error.name === 'AbortError') {
                console.error(`[API] 请求超时: ${method} ${path}`);
                return { success: false, error: '请求超时，请检查网络', data: null };
            }
            // 网络错误
            console.error(`[API] 网络异常: ${method} ${path}`, error);
            return { success: false, error: '网络异常，请检查服务器', data: null };
        }
    }

    /**
     * GET请求
     * @param {string} path - 请求路径
     * @returns {Promise<Object>} 响应数据
     */
    async get(path) {
        return this.request('GET', path);
    }

    /**
     * POST请求
     * @param {string} path - 请求路径
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} 响应数据
     */
    async post(path, data = {}) {
        return this.request('POST', path, data);
    }

    /**
     * PUT请求
     * @param {string} path - 请求路径
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} 响应数据
     */
    async put(path, data = {}) {
        return this.request('PUT', path, data);
    }

    /**
     * DELETE请求
     * @param {string} path - 请求路径
     * @returns {Promise<Object>} 响应数据
     */
    async delete(path) {
        return this.request('DELETE', path);
    }

    /* ========== 游戏相关API ========== */

    /**
     * 创建新游戏
     * @returns {Promise<Object>} 游戏数据 {game_id, ...}
     */
    async createGame() {
        const result = await this.post('/api/game/new');
        if (result.success && result.data) {
            // 兼容不同后端返回格式
            const gameId = result.data.game_id || result.data.gameId || result.data.id;
            if (gameId) {
                this.setGameId(gameId);
            }
        }
        return result;
    }

    /**
     * 玩家叫分
     * @param {number} playerId - 玩家ID
     * @param {number} score - 叫分(1/2/3)
     * @returns {Promise<Object>} 叫分结果
     */
    async bid(playerId, score) {
        return this.post(`/api/game/${this.gameId}/bid`, { playerId, score });
    }

    /**
     * 玩家出牌
     * @param {number} playerId - 玩家ID
     * @param {Array} cards - 出牌数组 [{id, suit, rank}]
     * @returns {Promise<Object>} 出牌结果
     */
    async play(playerId, cards) {
        return this.post(`/api/game/${this.gameId}/play`, { playerId, cards });
    }

    /**
     * 玩家过牌（不出）
     * @param {number} playerId - 玩家ID
     * @returns {Promise<Object>} 过牌结果
     */
    async pass(playerId) {
        return this.post(`/api/game/${this.gameId}/pass`, { playerId });
    }

    /**
     * AI叫分
     * @param {number} playerId - AI玩家ID
     * @returns {Promise<Object>} AI叫分结果
     */
    async aiBid(playerId) {
        return this.post(`/api/game/${this.gameId}/ai-bid`, { playerId });
    }

    /**
     * AI出牌
     * @param {number} playerId - AI玩家ID
     * @returns {Promise<Object>} AI出牌结果
     */
    async aiPlay(playerId) {
        return this.post(`/api/game/${this.gameId}/ai-play`, { playerId });
    }

    /**
     * 获取出牌提示
     * @param {number} playerId - 玩家ID
     * @returns {Promise<Object>} 提示结果
     */
    async hint(playerId) {
        return this.post(`/api/game/${this.gameId}/hint`, { playerId });
    }

    /**
     * 获取游戏状态
     * @returns {Promise<Object>} 游戏状态数据
     */
    async getGameState() {
        return this.get(`/api/game/${this.gameId}/state`);
    }

    /**
     * 获取结算结果
     * @returns {Promise<Object>} 结算数据
     */
    async getSettle() {
        return this.get(`/api/game/${this.gameId}/settle`);
    }

    /* ========== 战绩相关API ========== */

    /**
     * 获取战绩统计
     * @returns {Promise<Object>} 战绩数据
     */
    async getStats() {
        return this.get('/api/stats');
    }

    /**
     * 上报战绩
     * @param {Object} statsData - 战绩数据
     * @returns {Promise<Object>} 上报结果
     */
    async reportStats(statsData) {
        return this.post('/api/stats', statsData);
    }

    /**
     * 重置战绩
     * @returns {Promise<Object>} 重置结果
     */
    async resetStats() {
        return this.delete('/api/stats/reset');
    }

    /* ========== 设置相关API ========== */

    /**
     * 获取设置
     * @returns {Promise<Object>} 设置数据
     */
    async getSettings() {
        return this.get('/api/settings');
    }

    /**
     * 更新设置
     * @param {Object} settingsData - 设置数据
     * @returns {Promise<Object>} 更新结果
     */
    async updateSettings(settingsData) {
        return this.put('/api/settings', settingsData);
    }
}

// 导出全局
window.ApiClient = ApiClient;
