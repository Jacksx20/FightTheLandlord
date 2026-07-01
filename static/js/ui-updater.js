/**
 * ============================================
 * 斗地主游戏 - UI更新器
 * 负责所有UI渲染更新
 * ============================================
 */

class UIUpdater {
    /**
     * 构造函数
     * @param {CardRenderer} cardRenderer - 扑克牌渲染器
     * @param {StateManager} stateManager - 状态管理器
     */
    constructor(cardRenderer, stateManager) {
        this.cardRenderer = cardRenderer;
        this.stateManager = stateManager;
    }

    /**
     * 渲染玩家手牌
     * @param {Array} cards - 手牌数组
     */
    renderHandCards(cards) {
        if (!cards) return;
        // 按点数从大到小排序
        const sorted = Utils.sortCards(cards);
        this.cardRenderer.renderHand(sorted, 'hand-cards');
    }

    /**
     * 渲染出牌区
     * @param {number} playerId - 玩家ID (0=玩家, 1=AI左, 2=AI右)
     * @param {Array} cards - 出牌数组
     */
    renderPlayArea(playerId, cards) {
        const containerMap = {
            0: 'player-play',
            1: 'ai-left-play',
            2: 'ai-right-play'
        };
        const containerId = containerMap[playerId];
        if (!containerId) return;

        if (!cards || cards.length === 0) {
            this.cardRenderer.renderPass(containerId);
        } else {
            this.cardRenderer.renderPlayArea(cards, containerId);
        }
    }

    /**
     * 清空所有出牌区
     */
    clearPlayAreas() {
        ['player-play', 'ai-left-play', 'ai-right-play'].forEach(id => {
            const el = Utils.$(id);
            if (el) el.innerHTML = '<span class="play-area-placeholder text-xs text-slate-500">等待出牌...</span>';
        });
    }

    /**
     * 渲染玩家信息（角色、剩余牌数）
     * @param {Array} players - 玩家数组
     */
    renderPlayerInfo(players) {
        if (!players) return;

        players.forEach(player => {
            const id = player.id;
            const role = player.role;
            const handCount = player.handCardCount ?? player.hand_card_count ?? (player.handCards || player.hand_cards || []).length;

            // 角色标识
            const roleEl = Utils.$(`ai-${id === 1 ? 'left' : 'right'}-role`);
            if (roleEl) {
                roleEl.textContent = Utils.getRoleIcon(role) + ' ' + Utils.getRoleName(role);
            }

            // 剩余牌数
            const countEl = Utils.$(`ai-${id === 1 ? 'left' : 'right'}-count`);
            if (countEl) {
                countEl.textContent = `🃏 ×${handCount}`;
            }

            // AI手牌背面
            if (id !== 0) {
                this.cardRenderer.renderBack(handCount, `ai-${id === 1 ? 'left' : 'right'}-cards`);
            }
        });
    }

    /**
     * 渲染底牌区
     * @param {Array} cards - 底牌数组
     * @param {boolean} revealed - 是否已公开
     */
    renderHiddenCards(cards, revealed) {
        if (!cards) return;
        this.cardRenderer.renderHiddenCards(cards, revealed, 'hidden-cards');
    }

    /**
     * 更新操作按钮显示状态
     * @param {Object} state - 游戏状态
     */
    updateButtons(state) {
        const phase = state?.phase || state?.gamePhase;
        const currentPlayer = state?.currentPlayer ?? state?.current_player;
        const isMyTurn = currentPlayer === 0;

        // 叫地主按钮
        const bidPanel = Utils.$('bid-panel');
        // 出牌按钮
        const playPanel = Utils.$('play-panel');
        // 开始按钮
        const btnStart = Utils.$('btn-start');

        // 默认隐藏所有操作面板
        Utils.hide(bidPanel);
        Utils.hide(playPanel);

        if (phase === 'bidding' && isMyTurn) {
            // 叫地主阶段，轮到我
            Utils.show(bidPanel);
            this._updateBidButtons(state);
        } else if (phase === 'playing' && isMyTurn) {
            // 出牌阶段，轮到我
            Utils.show(playPanel);
            this._updatePlayButtons(state);
        }

        // 非游戏进行中显示开始按钮
        if (!phase || phase === 'idle') {
            Utils.show(btnStart);
        } else {
            Utils.hide(btnStart);
        }
    }

    /**
     * 更新叫分按钮可用状态
     * @param {Object} state - 游戏状态
     */
    _updateBidButtons(state) {
        const bidScore = state?.bidScore ?? state?.bid_score ?? 0;
        Utils.$('btn-bid-1').disabled = bidScore >= 1;
        Utils.$('btn-bid-2').disabled = bidScore >= 2;
        Utils.$('btn-bid-3').disabled = bidScore >= 3;
        // 样式更新
        [1, 2, 3].forEach(score => {
            const btn = Utils.$(`btn-bid-${score}`);
            if (btn) {
                btn.style.opacity = bidScore >= score ? '0.4' : '1';
                btn.style.cursor = bidScore >= score ? 'not-allowed' : 'pointer';
            }
        });
    }

    /**
     * 更新出牌按钮状态
     * @param {Object} state - 游戏状态
     */
    _updatePlayButtons(state) {
        const isFreePlay = this.stateManager.isFreePlay();
        const btnPass = Utils.$('btn-pass');
        if (btnPass) {
            // 自由出牌权时隐藏"不出"按钮
            btnPass.style.display = isFreePlay ? 'none' : '';
        }
    }

    /**
     * 更新倒计时显示
     * @param {number} seconds - 剩余秒数
     */
    updateCountdown(seconds) {
        const countdownEl = Utils.$('countdown');
        if (!countdownEl) return;

        if (seconds > 0) {
            Utils.show(countdownEl);
            const ringText = countdownEl.querySelector('.ring-text');
            if (ringText) {
                ringText.textContent = seconds;
                ringText.style.color = seconds <= 5 ? '#ef4444' : '#fbbf24';
            }
        } else {
            Utils.hide(countdownEl);
        }
    }

    /**
     * 显示提示信息
     * @param {string} text - 提示文本
     * @param {string} type - 类型: success/error/warning/info
     */
    showMessage(text, type = 'info') {
        Utils.toast(text, type);
    }

    /**
     * 更新状态栏文本
     * @param {string} text - 状态文本
     */
    updateStatusText(text) {
        const el = Utils.$('status-text');
        if (el) el.textContent = text;
    }

    /**
     * 显示叫分选项
     * @param {number} currentBidScore - 当前最高叫分
     */
    showBidOptions(currentBidScore) {
        Utils.show('bid-panel');
        Utils.hide('play-panel');
        this._updateBidButtons({ bidScore: currentBidScore });
    }

    /**
     * 隐藏叫分选项
     */
    hideBidOptions() {
        Utils.hide('bid-panel');
    }

    /**
     * 显示结算面板
     * @param {Object} result - 结算结果
     */
    showSettlePanel(result) {
        const panel = Utils.$('settle-panel');
        if (!panel) return;

        // 判断玩家是否胜利
        const myScore = result.scores?.[0] ?? 0;
        const isWin = myScore > 0;

        // 图标
        const iconEl = Utils.$('settle-icon');
        if (iconEl) iconEl.textContent = isWin ? '🎉' : '😢';

        // 标题
        const titleEl = Utils.$('settle-title');
        if (titleEl) {
            titleEl.textContent = isWin ? '胜利！' : '失败...';
            titleEl.style.color = isWin ? '#34d399' : '#ef4444';
        }

        // 详情
        const roleEl = Utils.$('settle-role');
        if (roleEl) roleEl.textContent = Utils.getRoleName(result.winner === 'landlord' ? 'landlord' : 'farmer');

        const baseEl = Utils.$('settle-base');
        if (baseEl) baseEl.textContent = result.baseScore ?? 100;

        const bidEl = Utils.$('settle-bid');
        if (bidEl) bidEl.textContent = result.bidScore ?? 1;

        const multiEl = Utils.$('settle-multi');
        if (multiEl) multiEl.textContent = result.multiplier ?? 1;

        const scoreEl = Utils.$('settle-score');
        if (scoreEl) {
            scoreEl.textContent = (myScore >= 0 ? '+' : '') + myScore;
            scoreEl.style.color = myScore >= 0 ? '#34d399' : '#ef4444';
        }

        Utils.show(panel);
    }

    /**
     * 隐藏结算面板
     */
    hideSettlePanel() {
        Utils.hide('settle-panel');
    }

    /**
     * 显示战绩面板
     * @param {Object} stats - 战绩数据
     */
    showStatsPanel(stats) {
        if (!stats) return;

        const data = stats.data || stats;
        const el = (id, val) => { const e = Utils.$(id); if (e) e.textContent = val; };

        el('stats-total', data.totalGames ?? 0);
        el('stats-winrate', Utils.formatPercent(data.totalWins ?? 0, data.totalGames ?? 0));
        el('stats-landlord-winrate', Utils.formatPercent(data.landlordWins ?? 0, data.landlordGames ?? 0));
        el('stats-farmer-winrate', Utils.formatPercent(data.farmerWins ?? 0, data.farmerGames ?? 0));
        el('stats-score', data.totalScore ?? 0);

        Utils.show('stats-panel');
    }

    /**
     * 显示设置面板
     * @param {Object} settings - 设置数据
     */
    showSettingsPanel(settings) {
        const data = settings?.data || settings || {};
        const soundEl = Utils.$('setting-sound');
        if (soundEl) soundEl.checked = data.soundEnabled !== false;

        const baseEl = Utils.$('setting-base-score');
        if (baseEl) baseEl.value = data.baseScore ?? 100;

        const countdownEl = Utils.$('setting-countdown');
        if (countdownEl) countdownEl.value = data.countdown ?? 30;

        Utils.show('settings-panel');
    }

    /**
     * 隐藏所有模态框
     */
    hideModals() {
        ['settle-panel', 'stats-panel', 'settings-panel'].forEach(id => Utils.hide(id));
    }

    /**
     * 重置游戏界面到初始状态
     */
    resetUI() {
        this.clearPlayAreas();
        this.hideBidOptions();
        Utils.hide('play-panel');
        Utils.hide('bid-panel');
        Utils.hide('countdown');
        Utils.show('btn-start');
        this.updateStatusText('点击开始游戏');

        // 清空手牌
        const handCards = Utils.$('hand-cards');
        if (handCards) handCards.innerHTML = '';

        // 清空底牌
        const hiddenCards = Utils.$('hidden-cards');
        if (hiddenCards) hiddenCards.innerHTML = '';

        // 重置AI信息
        ['left', 'right'].forEach(side => {
            const roleEl = Utils.$(`ai-${side}-role`);
            if (roleEl) roleEl.textContent = '';
            const countEl = Utils.$(`ai-${side}-count`);
            if (countEl) countEl.textContent = '🃏 ×17';
            const cardsEl = Utils.$(`ai-${side}-cards`);
            if (cardsEl) cardsEl.innerHTML = '';
        });
    }
}

// 导出全局
window.UIUpdater = UIUpdater;