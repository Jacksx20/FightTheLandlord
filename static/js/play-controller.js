/**
 * ============================================
 * 斗地主游戏 - 出牌控制器
 * 处理出牌/过牌/提示交互
 * ============================================
 */

class PlayController {
    /**
     * 构造函数
     * @param {ApiClient} apiClient - API客户端
     * @param {StateManager} stateManager - 状态管理器
     * @param {UIUpdater} uiUpdater - UI更新器
     * @param {AnimationEngine} animationEngine - 动画引擎
     * @param {SoundManager} soundManager - 音效管理器
     */
    constructor(apiClient, stateManager, uiUpdater, animationEngine, soundManager) {
        this.api = apiClient;
        this.state = stateManager;
        this.ui = uiUpdater;
        this.anim = animationEngine;
        this.sound = soundManager;
        /** @type {Array} 当前选中的牌 */
        this.selectedCards = [];
    }

    /**
     * 手牌选中/取消选中
     * @param {number} cardId - 牌ID
     */
    selectCard(cardId) {
        const cards = this.state.getMyHandCards();
        const card = cards.find(c => c.id === cardId);
        if (!card) return;

        // 切换选中状态
        if (card._selected) {
            card._selected = false;
            this.selectedCards = this.selectedCards.filter(c => c.id !== cardId);
        } else {
            card._selected = true;
            this.selectedCards.push(card);
        }

        this.sound.play('select');
        // 更新UI选中状态
        this.cardRenderer = window.cardRenderer;
        if (this.cardRenderer) {
            this.cardRenderer.updateSelection(cards, 'hand-cards');
        }
    }

    /**
     * 提交出牌
     */
    async playCards() {
        const cards = this.getSelectedCards();
        if (cards.length === 0) {
            this.ui.showMessage('请先选择要出的牌', 'warning');
            return;
        }

        this.sound.play('play');

        try {
            const result = await this.api.play(0, cards);
            const data = result.data?.data || result.data;

            if (data?.success === false) {
                this.ui.showMessage(data.error || '不合法的出牌', 'error');
                this.sound.play('error');
                return;
            }

            if (result.success && data?.success !== false) {
                await this._onPlaySuccess(data, cards);
            } else {
                this.ui.showMessage(data?.error || '出牌失败', 'error');
                this.sound.play('error');
            }
        } catch (error) {
            console.error('[PlayController] 出牌异常:', error);
            this.ui.showMessage('出牌请求失败', 'error');
        }
    }

    /**
     * 出牌成功处理
     * @param {Object} data - 出牌结果
     * @param {Array} cards - 出的牌
     */
    async _onPlaySuccess(data, cards) {
        // 清空选中
        this.clearSelection();

        // 渲染出牌区
        this.ui.renderPlayArea(0, cards);

        // 牌型提示
        if (data.pattern) {
            const patternName = Utils.getPatternName(data.pattern.type);
            this.anim.patternHint(patternName, Utils.$('pattern-hint'));
        }

        // 炸弹/火箭特效
        if (data.isBomb) {
            const patternType = data.pattern?.type;
            if (patternType === 'rocket') {
                this.anim.rocketEffect();
                this.sound.play('rocket');
            } else {
                this.anim.bombEffect();
                this.sound.play('bomb');
            }
        }

        // 更新手牌
        const newHand = data.handCards || data.hand_cards;
        if (newHand) {
            this.ui.renderHandCards(newHand);
            // 更新状态中的手牌
            const stateData = this.state.getState();
            if (stateData && stateData.players) {
                const me = stateData.players.find(p => p.id === 0);
                if (me) {
                    me.handCards = newHand;

                }
            }
        }

        // 更新状态
        this.state.setState({
            currentPlayer: data.nextPlayer ?? data.next_player,
            phase: data.phase,
            multiplier: data.multiplier,
            isFreePlay: data.isFreePlay ?? data.is_free_play,
            lastPlay: data.lastPlay ?? data.last_play,
            lastPlayBy: data.lastPlayBy ?? data.last_play_by
        });

        if (data.isFreePlay ?? data.is_free_play) {
            this.ui.clearPlayAreas();
            this.ui.renderPlayArea(0, cards);
        }

        // 检测游戏结束
        if (data.winnerId !== undefined && data.winnerId !== null) {
            if (this.onGameEnd) this.onGameEnd(data);
            return;
        }

        // 通知game-controller轮转到下一位
        if (this.onNextTurn) this.onNextTurn(data);
    }

    /**
     * 过牌操作
     */
    async pass() {
        this.sound.play('pass');
        this.clearSelection();

        try {
            const result = await this.api.pass(0);
            const data = result.data?.data || result.data;

            if (data?.success === false) {
                this.ui.showMessage(data.error || '无法过牌', 'error');
                return;
            }

            // 渲染过牌
            this.ui.renderPlayArea(0, null);

            // 更新状态
            this.state.setState({
                currentPlayer: data.nextPlayer ?? data.next_player,
                phase: data.phase,
                isFreePlay: data.isFreePlay ?? data.is_free_play,
                lastPlay: data.lastPlay ?? data.last_play,
                lastPlayBy: data.lastPlayBy ?? data.last_play_by
            });

            this.ui.updateStatusText('你选择不出');

            // 通知轮转
            if (this.onNextTurn) this.onNextTurn(data);
        } catch (error) {
            console.error('[PlayController] 过牌异常:', error);
            this.ui.showMessage('过牌请求失败', 'error');
        }
    }

    /**
     * 获取出牌提示
     */
    async hint() {
        try {
            const result = await this.api.hint(0);
            const data = result.data?.data || result.data;

            if (data && data.cards && data.cards.length > 0) {
                // 清空当前选中
                this.clearSelection();

                // 选中提示的牌
                const handCards = this.state.getMyHandCards();
                const hintIds = new Set(data.cards.map(c => c.id));
                handCards.forEach(card => {
                    card._selected = hintIds.has(card.id);
                });
                this.selectedCards = handCards.filter(c => c._selected);

                // 更新UI
                this.ui.renderHandCards(handCards);
                this.ui.showMessage('已为你选择建议出牌', 'info');
            } else {
                this.ui.showMessage('没有可出的牌，请选择不出', 'warning');
            }
        } catch (error) {
            console.error('[PlayController] 提示异常:', error);
            this.ui.showMessage('获取提示失败', 'error');
        }
    }

    /**
     * 触发AI出牌决策
     * @param {number} playerId - AI玩家ID
     */
    async handleAiPlay(playerId) {
        this.ui.updateStatusText(`${Utils.getPlayerName(playerId)} 思考中...`);

        // 模拟AI思考延迟
        await Utils.randomDelay();

        try {
            const result = await this.api.aiPlay(playerId);
            const data = result.data?.data || result.data;

            if (!result.success) {
                this.ui.showMessage('AI出牌失败', 'error');
                return;
            }

            if (data.action === 'play' && data.cards && data.cards.length > 0) {
                // AI出牌
                this.ui.renderPlayArea(playerId, data.cards);
                this.sound.play('play');

                // 牌型提示
                if (data.pattern) {
                    const patternName = Utils.getPatternName(data.pattern.type);
                    this.anim.patternHint(patternName, Utils.$('pattern-hint'));
                }

                // 炸弹/火箭特效
                if (data.isBomb) {
                    const patternType = data.pattern?.type;
                    if (patternType === 'rocket') {
                        this.anim.rocketEffect();
                        this.sound.play('rocket');
                    } else {
                        this.anim.bombEffect();
                        this.sound.play('bomb');
                    }
                }

                this.ui.updateStatusText(`${Utils.getPlayerName(playerId)} 出牌`);
            } else {
                // AI过牌
                this.ui.renderPlayArea(playerId, null);
                this.sound.play('pass');
                this.ui.updateStatusText(`${Utils.getPlayerName(playerId)} 不出`);
            }

            // 更新玩家信息（剩余牌数）
            if (data.handCards || data.hand_cards) {
                // AI出牌后更新手牌数
            }

            // 更新状态
            this.state.setState({
                currentPlayer: data.nextPlayer ?? data.next_player,
                phase: data.phase,
                multiplier: data.multiplier,
                isFreePlay: data.isFreePlay ?? data.is_free_play,
                lastPlay: data.lastPlay ?? data.last_play,
                lastPlayBy: data.lastPlayBy ?? data.last_play_by
            });

            if (data.isFreePlay ?? data.is_free_play) {
                this.ui.clearPlayAreas();
            }
            const stateResult = await this.api.getGameState();
            if (stateResult.success) {
                const stateData = stateResult.data?.data || stateResult.data;
                if (stateData && stateData.players) {
                    this.ui.renderPlayerInfo(stateData.players);
                }
            }

            // 检测游戏结束
            if (data.winnerId !== undefined && data.winnerId !== null) {
                if (this.onGameEnd) this.onGameEnd(data);
                return;
            }

            // 通知轮转
            if (this.onNextTurn) this.onNextTurn(data);
        } catch (error) {
            console.error('[PlayController] AI出牌异常:', error);
        }
    }

    /**
     * 获取当前选中的牌
     * @returns {Array} 选中的牌数组
     */
    getSelectedCards() {
        return this.selectedCards.filter(c => c._selected);
    }

    /**
     * 清空选中状态
     */
    clearSelection() {
        const cards = this.state.getMyHandCards();
        cards.forEach(c => { c._selected = false; });
        this.selectedCards = [];
        this.ui.renderHandCards(cards);
    }
}

// 导出全局
window.PlayController = PlayController;