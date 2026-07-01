/**
 * ============================================
 * 斗地主游戏 - 游戏主控制器
 * 协调所有模块，驱动游戏流程
 * ============================================
 */

class GameController {
    /**
     * 构造函数
     * @param {ApiClient} apiClient - API客户端
     * @param {StateManager} stateManager - 状态管理器
     * @param {UIUpdater} uiUpdater - UI更新器
     * @param {BidController} bidController - 叫地主控制器
     * @param {PlayController} playController - 出牌控制器
     * @param {AnimationEngine} animationEngine - 动画引擎
     * @param {SoundManager} soundManager - 音效管理器
     */
    constructor(apiClient, stateManager, uiUpdater, bidController, playController, animationEngine, soundManager) {
        this.api = apiClient;
        this.state = stateManager;
        this.ui = uiUpdater;
        this.bidCtrl = bidController;
        this.playCtrl = playController;
        this.anim = animationEngine;
        this.sound = soundManager;

        /** @type {number|null} 倒计时定时器 */
        this.countdownTimer = null;
        /** @type {number} 倒计时剩余秒数 */
        this.countdownSeconds = 30;
        /** @type {boolean} 游戏是否进行中 */
        this.isPlaying = false;

        // 绑定子控制器回调
        this._bindCallbacks();
    }

    /**
     * 绑定子控制器回调
     */
    _bindCallbacks() {
        // 叫地主控制器回调
        this.bidCtrl.onLandlordSettled = (result) => {
            this._onLandlordSettled(result);
        };
        this.bidCtrl.onAllPass = (result) => {
            this._onAllPass(result);
        };
        this.bidCtrl.onNeedCountdown = (seconds) => {
            this.startCountdown(seconds);
        };

        // 出牌控制器回调
        this.playCtrl.onNextTurn = (data) => {
            this.nextTurn();
        };
        this.playCtrl.onGameEnd = (data) => {
            this.checkGameEnd(data);
        };
    }

    /**
     * 开始新游戏
     */
    async startGame() {
        this.ui.updateStatusText('正在创建游戏...');
        Utils.hide('btn-start');
        this.isPlaying = true;

        try {
            const result = await this.api.createGame();
            if (!result.success) {
                this.ui.showMessage('创建游戏失败: ' + (result.error || ''), 'error');
                Utils.show('btn-start');
                this.isPlaying = false;
                return;
            }

            const data = result.data?.data || result.data;
            if (!data) {
                this.ui.showMessage('游戏数据异常', 'error');
                Utils.show('btn-start');
                this.isPlaying = false;
                return;
            }

            // 设置游戏ID
            const gameId = data.gameId || data.game_id || data.id;
            if (gameId) {
                this.api.setGameId(gameId);
            }

            // 更新状态
            this.state.setState(data);

            // 播放发牌动画
            this.sound.play('deal');
            this.ui.updateStatusText('发牌中...');

            await Utils.sleep(500);

            // 渲染界面
            const players = data.players || [];
            this.ui.renderPlayerInfo(players);

            // 渲染玩家手牌
            const myCards = this.state.getMyHandCards();
            this.ui.renderHandCards(myCards);

            // 渲染底牌（未公开）
            if (data.hiddenCards || data.hidden_cards) {
                this.ui.renderHiddenCards(data.hiddenCards || data.hidden_cards, false);
            }

            // 进入叫地主阶段
            await Utils.sleep(500);
            this.ui.updateStatusText('叫地主阶段');

            const currentPlayer = data.currentPlayer ?? data.current_player ?? 0;
            this.state.setState({ phase: 'bidding', currentPlayer });

            if (currentPlayer === 0) {
                // 轮到我叫分
                this.bidCtrl.showBidOptions(data.bidScore ?? data.bid_score ?? 0);
                this.startCountdown(30);
            } else {
                // AI先叫分
                await this.bidCtrl.handleAiBid(currentPlayer);
            }
        } catch (error) {
            console.error('[GameController] 开始游戏异常:', error);
            this.ui.showMessage('创建游戏异常', 'error');
            Utils.show('btn-start');
            this.isPlaying = false;
        }
    }

    /**
     * 重置游戏状态
     */
    resetGame() {
        this.stopCountdown();
        this.isPlaying = false;
        this.state.reset();
        this.ui.resetUI();
        this.bidCtrl.stopBidTimeout();
    }

    /**
     * 驱动回合轮转
     */
    async nextTurn() {
        this.stopCountdown();

        const currentState = this.state.getState();
        if (!currentState) return;

        const phase = currentState.phase;
        if (phase !== 'playing' && phase !== 'bidding') return;

        const currentPlayer = currentState.currentPlayer;

        // 更新UI按钮
        this.ui.updateButtons(currentState);

        if (currentPlayer === 0) {
            // 轮到我
            this.ui.updateStatusText('轮到你出牌');
            this.startCountdown(this.countdownSeconds);
        } else {
            // AI回合
            this.ui.updateStatusText(`${Utils.getPlayerName(currentPlayer)} 思考中...`);
            await this.playCtrl.handleAiPlay(currentPlayer);
        }
    }

    /**
     * 地主确定后进入出牌阶段
     * @param {Object} result - 叫分结果
     */
    async _onLandlordSettled(result) {
        const landlordId = result.landlordId ?? result.landlord_id;

        // 更新玩家信息
        const stateResult = await this.api.getGameState();
        if (stateResult.success) {
            const stateData = stateResult.data?.data || stateResult.data;
            if (stateData && stateData.players) {
                this.ui.renderPlayerInfo(stateData.players);
                this.state.setState({ players: stateData.players });
            }
        }

        // 地主先出牌
        this.state.setState({ phase: 'playing', currentPlayer: landlordId });
        this.ui.updateStatusText(`地主 ${Utils.getPlayerName(landlordId)} 先出牌`);

        await Utils.sleep(500);

        if (landlordId === 0) {
            // 我是地主，轮到我出牌
            this.ui.updateButtons({ phase: 'playing', currentPlayer: 0 });
            this.startCountdown(this.countdownSeconds);
        } else {
            // AI地主先出牌
            await this.playCtrl.handleAiPlay(landlordId);
        }
    }

    /**
     * 全员不叫处理
     * @param {Object} result - 叫分结果
     */
    async _onAllPass(result) {
        this.ui.showMessage('无人叫地主，重新发牌', 'warning');

        // 更新手牌（后端已重新发牌）
        if (result.players) {
            this.ui.renderPlayerInfo(result.players);
            const myCards = result.players.find(p => p.id === 0);
            if (myCards) {
                const cards = myCards.handCards || myCards.hand_cards || [];
                this.state.setState({ players: result.players });
                this.ui.renderHandCards(cards);
            }
        }

        // 重新进入叫地主阶段
        await Utils.sleep(1000);
        const currentPlayer = result.nextPlayer ?? result.current_player ?? 0;
        this.state.setState({ phase: 'bidding', currentPlayer });

        if (currentPlayer === 0) {
            this.bidCtrl.showBidOptions(0);
            this.startCountdown(30);
        } else {
            await this.bidCtrl.handleAiBid(currentPlayer);
        }
    }

    /**
     * 检测游戏结束
     * @param {Object} data - 出牌结果
     */
    async checkGameEnd(data) {
        this.stopCountdown();
        this.isPlaying = false;

        try {
            // 获取结算结果
            const settleResult = await this.api.getSettle();
            if (settleResult.success) {
                const settleData = settleResult.data?.data || settleResult.data;
                this.showSettlement(settleData);
            } else {
                // 使用出牌返回的数据构造结算
                const winnerId = data.winnerId ?? data.winner_id;
                this.showSettlement({ winnerId, scores: {} });
            }
        } catch (error) {
            console.error('[GameController] 结算异常:', error);
        }
    }

    /**
     * 展示结算面板
     * @param {Object} result - 结算结果
     */
    async showSettlement(result) {
        // 播放胜负动画和音效
        const myScore = result.scores?.[0] ?? 0;
        if (myScore > 0) {
            this.anim.winAnimation();
            this.sound.play('win');
        } else {
            this.anim.loseAnimation();
            this.sound.play('lose');
        }

        await Utils.sleep(1000);

        // 显示结算面板
        this.ui.showSettlePanel(result);

        // 上报战绩
        try {
            const isWin = myScore > 0;
            const stateData = this.state.getState();
            const me = stateData?.players?.find(p => p.id === 0);
            const role = me?.role || 'farmer';
            await this.api.reportStats({
                result: isWin ? 'win' : 'lose',
                role: role,
                score: Math.abs(myScore)
            });
        } catch (e) {
            // 战绩上报失败不影响游戏
        }
    }

    /**
     * 再来一局
     */
    playAgain() {
        this.ui.hideSettlePanel();
        this.anim.stopCountdown();
        this.resetGame();
        this.startGame();
    }

    /**
     * 启动倒计时
     * @param {number} seconds - 倒计时秒数
     */
    startCountdown(seconds) {
        this.stopCountdown();

        this.countdownSeconds = seconds;
        if (seconds <= 0) return; // 无限制

        let remaining = seconds;
        this.ui.updateCountdown(remaining);
        Utils.show('countdown');

        this.countdownTimer = setInterval(() => {
            remaining--;
            this.ui.updateCountdown(remaining);

            if (remaining <= 5) {
                this.sound.play('countdown');
            }

            if (remaining <= 0) {
                this.stopCountdown();
                this.handleCountdownTimeout();
            }
        }, 1000);
    }

    /**
     * 停止倒计时
     */
    stopCountdown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        Utils.hide('countdown');
    }

    /**
     * 倒计时超时处理
     */
    handleCountdownTimeout() {
        const phase = this.state.getPhase();

        if (phase === 'bidding') {
            // 叫地主超时，自动不叫
            this.ui.showMessage('叫分超时，自动不叫', 'warning');
            this.bidCtrl.bid(0);
        } else if (phase === 'playing') {
            // 出牌超时
            const isFreePlay = this.state.isFreePlay();
            if (isFreePlay) {
                // 自由出牌权，自动出最小牌
                this.ui.showMessage('出牌超时，自动出牌', 'warning');
                this.playCtrl.hint();
                setTimeout(() => this.playCtrl.playCards(), 500);
            } else {
                // 非自由出牌权，自动过牌
                this.ui.showMessage('出牌超时，自动不出', 'warning');
                this.playCtrl.pass();
            }
        }
    }
}

// 导出全局
window.GameController = GameController;