/**
 * ============================================
 * 斗地主游戏 - 前端状态管理器
 * 同步后端游戏状态到前端，观察者模式
 * ============================================
 */

class StateManager {
    constructor() {
        /** @type {Object|null} 当前游戏状态 */
        this.state = null;
        /** @type {Array<Function>} 观察者回调列表 */
        this.listeners = [];
    }

    /**
     * 更新游戏状态并通知所有观察者
     * @param {Object} newState - 新的游戏状态
     */
    setState(newState) {
        // 深度合并状态
        this.state = { ...this.state, ...newState };
        // 通知所有观察者
        this.notify();
    }

    /**
     * 获取当前游戏状态
     * @returns {Object|null} 当前游戏状态
     */
    getState() {
        return this.state;
    }

    /**
     * 订阅状态变更
     * @param {Function} callback - 回调函数，接收新状态作为参数
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    /**
     * 取消订阅
     * @param {Function} callback - 要移除的回调函数
     */
    unsubscribe(callback) {
        this.listeners = this.listeners.filter(fn => fn !== callback);
    }

    /**
     * 通知所有观察者状态已变更
     */
    notify() {
        this.listeners.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('[StateManager] 观察者回调异常:', error);
            }
        });
    }

    /**
     * 重置状态
     */
    reset() {
        this.state = null;
        this.notify();
    }

    /**
     * 获取当前玩家手牌
     * @returns {Array} 手牌数组
     */
    getMyHandCards() {
        if (!this.state || !this.state.players) return [];
        const me = this.state.players.find(p => p.id === 0 || !p.isAI);
        return me ? (me.handCards || me.hand_cards || []) : [];
    }

    /**
     * 获取当前回合玩家ID
     * @returns {number|null} 当前玩家ID
     */
    getCurrentPlayer() {
        return this.state ? (this.state.currentPlayer ?? this.state.current_player) : null;
    }

    /**
     * 获取游戏阶段
     * @returns {string|null} 游戏阶段
     */
    getPhase() {
        return this.state ? (this.state.phase || this.state.gamePhase) : null;
    }

    /**
     * 是否轮到人类玩家
     * @returns {boolean}
     */
    isMyTurn() {
        return this.getCurrentPlayer() === 0;
    }

    /**
     * 是否自由出牌
     * @returns {boolean}
     */
    isFreePlay() {
        if (!this.state) return true;
        return this.state.isFreePlay || this.state.is_free_play || this.state.lastPlay === null || this.state.last_play === null;
    }
}

// 导出全局
window.StateManager = StateManager;