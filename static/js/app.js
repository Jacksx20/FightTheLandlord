/**
 * ============================================
 * 斗地主游戏 - 前端入口
 * 初始化所有模块，绑定DOM事件
 * ============================================
 */

(function () {
    'use strict';

    // ========== 初始化所有模块 ==========
    const apiClient = new ApiClient();
    const stateManager = new StateManager();
    const cardRenderer = window.cardRenderer || new CardRenderer();
    const animationEngine = window.animationEngine || new AnimationEngine();
    const soundManager = new SoundManager();
    const uiUpdater = new UIUpdater(cardRenderer, stateManager);
    const bidController = new BidController(apiClient, stateManager, uiUpdater, animationEngine, soundManager);
    const playController = new PlayController(apiClient, stateManager, uiUpdater, animationEngine, soundManager);
    const gameController = new GameController(apiClient, stateManager, uiUpdater, bidController, playController, animationEngine, soundManager);

    // ========== 绑定DOM事件 ==========

    // 开始游戏按钮
    const btnStart = Utils.$('btn-start');
    if (btnStart) {
        btnStart.addEventListener('click', () => gameController.startGame());
    }

    // 叫地主按钮
    [1, 2, 3, 0].forEach(score => {
        const btn = Utils.$(`btn-bid-${score}`);
        if (btn) {
            btn.addEventListener('click', () => bidController.bid(score));
        }
    });

    // 出牌按钮
    const btnPlay = Utils.$('btn-play');
    if (btnPlay) {
        btnPlay.addEventListener('click', () => playController.playCards());
    }

    // 不出按钮
    const btnPass = Utils.$('btn-pass');
    if (btnPass) {
        btnPass.addEventListener('click', () => playController.pass());
    }

    // 提示按钮
    const btnHint = Utils.$('btn-hint');
    if (btnHint) {
        btnHint.addEventListener('click', () => playController.hint());
    }

    // 再来一局按钮
    const btnPlayAgain = Utils.$('btn-play-again');
    if (btnPlayAgain) {
        btnPlayAgain.addEventListener('click', () => gameController.playAgain());
    }

    // 战绩按钮
    const btnStats = Utils.$('btn-stats');
    if (btnStats) {
        btnStats.addEventListener('click', async () => {
            try {
                const result = await apiClient.getStats();
                if (result.success) {
                    uiUpdater.showStatsPanel(result.data?.data || result.data);
                } else {
                    Utils.toast('获取战绩失败', 'error');
                }
            } catch (e) {
                Utils.toast('获取战绩失败', 'error');
            }
        });
    }

    // 重置战绩按钮
    const btnResetStats = Utils.$('btn-reset-stats');
    if (btnResetStats) {
        btnResetStats.addEventListener('click', async () => {
            if (confirm('确定要重置所有战绩吗？')) {
                try {
                    await apiClient.resetStats();
                    Utils.toast('战绩已重置', 'success');
                    Utils.hide('stats-panel');
                } catch (e) {
                    Utils.toast('重置失败', 'error');
                }
            }
        });
    }

    // 设置按钮
    const btnSettings = Utils.$('btn-settings');
    if (btnSettings) {
        btnSettings.addEventListener('click', async () => {
            try {
                const result = await apiClient.getSettings();
                if (result.success) {
                    uiUpdater.showSettingsPanel(result.data?.data || result.data);
                } else {
                    uiUpdater.showSettingsPanel({});
                }
            } catch (e) {
                uiUpdater.showSettingsPanel({});
            }
        });
    }

    // 保存设置按钮
    const btnSaveSettings = Utils.$('btn-save-settings');
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', async () => {
            const soundEnabled = Utils.$('setting-sound')?.checked ?? true;
            const baseScore = parseInt(Utils.$('setting-base-score')?.value ?? '100');
            const countdown = parseInt(Utils.$('setting-countdown')?.value ?? '30');

            soundManager.setEnabled(soundEnabled);
            gameController.countdownSeconds = countdown || 30;

            try {
                await apiClient.updateSettings({
                    soundEnabled,
                    baseScore,
                    countdown
                });
                Utils.toast('设置已保存', 'success');
                Utils.hide('settings-panel');
            } catch (e) {
                Utils.toast('保存设置失败', 'error');
            }
        });
    }

    // 手牌选中事件（通过自定义事件监听）
    const handCards = Utils.$('hand-cards');
    if (handCards) {
        handCards.addEventListener('cardSelect', (e) => {
            const { card, selected } = e.detail;
            if (selected) {
                if (!playController.selectedCards.find(c => c.id === card.id)) {
                    playController.selectedCards.push(card);
                }
            } else {
                playController.selectedCards = playController.selectedCards.filter(c => c.id !== card.id);
            }
            soundManager.play('select');
        });
    }

    // 倒计时结束事件
    const countdownEl = Utils.$('countdown');
    if (countdownEl) {
        countdownEl.addEventListener('countdownEnd', () => {
            gameController.handleCountdownTimeout();
        });
    }

    // ========== 全局暴露 ==========
    window.gameController = gameController;
    window.playController = playController;
    window.bidController = bidController;
    window.uiUpdater = uiUpdater;
    window.soundManager = soundManager;
    window.apiClient = apiClient;

    // ========== 初始化完成 ==========
    console.log('[斗地主] 游戏初始化完成 ✅');
    Utils.toast('游戏加载完成，点击开始游戏 🎮', 'success', 3000);

})();