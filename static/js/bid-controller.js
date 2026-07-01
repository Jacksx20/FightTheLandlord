/**
 * ============================================
 * 斗地主游戏 - 叫地主控制器
 * 处理叫地主/抢地主交互
 * ============================================
 */

class BidController {
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
        /** @type {number|null} 叫分超时定时器 */
        this.bidTimeout = null;
    }

    /**
     * 显示叫分选项并启动超时
     * @param {number} currentBidScore - 当前最高叫分
     */
    showBidOptions(currentBidScore) {
        this.ui.showBidOptions(currentBidScore);
        this.ui.updateStatusText('请选择叫分');
        this.sound.play('bid');

        // 启动叫分超时（30秒）
        this.startBidTimeout(30);
    }

    /**
     * 玩家叫分
     * @param {number} score - 叫分值(0=不叫, 1/2/3=叫分)
     */
    async bid(score) {
        // 清除超时
        this.stopBidTimeout();
        // 隐藏叫分选项
        this.ui.hideBidOptions();

        this.sound.play('bid');

        try {
            // 调用API叫分
            const result = await this.api.bid(0, score);
            if (result.success) {
                await this.onBidResult(result.data?.data || result.data);
            } else {
                this.ui.showMessage(result.error || '叫分失败', 'error');
            }
        } catch (error) {
            console.error('[BidController] 叫分异常:', error);
            this.ui.showMessage('叫分请求失败', 'error');
        }
    }

    /**
     * 处理叫分结果
     * @param {Object} result - 叫分结果数据
     */
    async onBidResult(result) {
        if (!result) return;

        // 更新状态
        this.state.setState({
            bidScore: result.bidScore ?? result.bid_score,
            bidder: result.bidder,
            currentPlayer: result.nextPlayer ?? result.next_player,
            phase: result.phase
        });

        // 叫分提示
        if (result.bidder !== null && result.bidder !== undefined) {
            const bidScore = result.bidScore ?? result.bid_score;
            if (bidScore > 0) {
                this.ui.updateStatusText(`${Utils.getPlayerName(result.bidder)} 叫了 ${bidScore} 分`);
            }
        }

        // 地主已确定
        if (result.isLandlordSettled ?? result.is_landlord_settled) {
            await this._onLandlordSettled(result);
            return;
        }

        // 全员不叫，重新发牌
        if (result.message && result.message.includes('重新发牌')) {
            this.ui.showMessage('无人叫地主，重新发牌', 'warning');
            // 重新发牌由game-controller处理
            if (this.onAllPass) this.onAllPass(result);
            return;
        }

        // 轮转到下一位叫分
        const nextPlayer = result.nextPlayer ?? result.next_player;
        if (nextPlayer !== undefined && nextPlayer !== null) {
            if (nextPlayer === 0) {
                // 轮到我叫分
                this.showBidOptions(result.bidScore ?? result.bid_score ?? 0);
            } else {
                // AI叫分
                await this.handleAiBid(nextPlayer);
            }
        }
    }

    /**
     * 地主确定后的处理
     * @param {Object} result - 叫分结果
     */
    async _onLandlordSettled(result) {
        const landlordId = result.landlordId ?? result.landlord_id;
        this.ui.updateStatusText(`${Utils.getPlayerName(landlordId)} 成为地主！`);

        // 底牌公开动画
        const hiddenCards = result.hiddenCards ?? result.hidden_cards;
        if (hiddenCards) {
            this.ui.renderHiddenCards(hiddenCards, true);
            this.anim.flipCards(
                Array.from(document.querySelectorAll('#hidden-cards .card'))
            );
            await Utils.sleep(800);
        }

        // 更新状态进入出牌阶段
        this.state.setState({
            phase: 'playing',
            landlordId: landlordId,
            currentPlayer: landlordId,
            hiddenCards: hiddenCards
        });

        // 通知game-controller进入出牌阶段
        if (this.onLandlordSettled) this.onLandlordSettled(result);
    }

    /**
     * 触发AI叫分决策
     * @param {number} playerId - AI玩家ID
     */
    async handleAiBid(playerId) {
        this.ui.updateStatusText(`${Utils.getPlayerName(playerId)} 思考中...`);

        // 模拟AI思考延迟
        await Utils.randomDelay();

        try {
            const result = await this.api.aiBid(playerId);
            if (result.success) {
                const data = result.data?.data || result.data;
                const score = data?.score ?? 0;
                if (score > 0) {
                    this.ui.updateStatusText(`${Utils.getPlayerName(playerId)} 叫了 ${score} 分`);
                    this.sound.play('bid');
                } else {
                    this.ui.updateStatusText(`${Utils.getPlayerName(playerId)} 不叫`);
                }
                await Utils.sleep(800);
                await this.onBidResult(data);
            } else {
                this.ui.showMessage('AI叫分失败', 'error');
            }
        } catch (error) {
            console.error('[BidController] AI叫分异常:', error);
        }
    }

    /**
     * 启动叫分超时
     * @param {number} seconds - 超时秒数
     */
    startBidTimeout(seconds) {
        this.stopBidTimeout();
        this.bidTimeout = setTimeout(() => {
            this.ui.showMessage('叫分超时，自动不叫', 'warning');
            this.bid(0); // 超时自动不叫
        }, seconds * 1000);
    }

    /**
     * 停止叫分超时
     */
    stopBidTimeout() {
        if (this.bidTimeout) {
            clearTimeout(this.bidTimeout);
            this.bidTimeout = null;
        }
    }
}

// 导出全局
window.BidController = BidController;