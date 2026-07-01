/**
 * ============================================
 * 斗地主游戏 - 动画引擎
 * 管理所有CSS/JS动画的触发与编排
 * ============================================
 */

class AnimationEngine {
    constructor() {
        // 烟花Canvas
        this.fireworksCanvas = null;
        this.fireworksCtx = null;
        this.particles = [];
        this.fireworksAnimId = null;

        // 倒计时定时器
        this.countdownTimer = null;

        // 屏幕闪烁元素
        this.screenFlash = null;

        // 初始化
        this._initScreenFlash();
    }

    /**
     * 初始化屏幕闪烁效果元素
     */
    _initScreenFlash() {
        this.screenFlash = document.getElementById('screen-flash');
        if (!this.screenFlash) {
            this.screenFlash = document.createElement('div');
            this.screenFlash.id = 'screen-flash';
            this.screenFlash.className = 'screen-flash';
            document.body.appendChild(this.screenFlash);
        }
    }

    /**
     * 发牌动画 - 牌从中央依次飞向各玩家位置
     * @param {Function} callback - 动画完成回调
     */
    dealAnimation(callback) {
        const dealPile = document.getElementById('deal-pile');
        const playerHand = document.getElementById('hand-cards');
        const aiLeftCards = document.getElementById('ai-left-cards');
        const aiRightCards = document.getElementById('ai-right-cards');

        // 获取各目标位置
        const targets = [
            playerHand ? playerHand.getBoundingClientRect() : null,
            aiLeftCards ? aiLeftCards.getBoundingClientRect() : null,
            aiRightCards ? aiRightCards.getBoundingClientRect() : null
        ];

        // 创建发牌堆
        if (dealPile) {
            dealPile.innerHTML = '';
            dealPile.style.display = 'flex';

            // 创建54张背面牌堆
            for (let i = 0; i < 6; i++) {
                const stackCard = document.createElement('div');
                stackCard.className = 'card face-down small';
                stackCard.style.position = 'absolute';
                stackCard.style.top = `${i * 2}px`;
                stackCard.style.left = `${i * 1}px`;
                stackCard.style.zIndex = i;
                dealPile.appendChild(stackCard);
            }
        }

        // 发牌动画序列 - 每张牌间隔50ms飞出
        const totalCards = 51; // 17×3
        let dealtCount = 0;
        const dealInterval = 50;

        const dealTimer = setInterval(() => {
            dealtCount++;

            // 创建飞行中的牌
            const flyingCard = document.createElement('div');
            flyingCard.className = 'card face-down small';
            flyingCard.style.position = 'fixed';
            flyingCard.style.zIndex = '100';
            flyingCard.style.left = '50%';
            flyingCard.style.top = '50%';
            flyingCard.style.transform = 'translate(-50%, -50%) scale(0.5)';
            flyingCard.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            flyingCard.style.opacity = '0';
            document.body.appendChild(flyingCard);

            // 触发飞行动画
            requestAnimationFrame(() => {
                const targetIdx = dealtCount % 3;
                const target = targets[targetIdx];
                if (target) {
                    flyingCard.style.left = `${target.left + target.width / 2}px`;
                    flyingCard.style.top = `${target.top + target.height / 2}px`;
                }
                flyingCard.style.transform = 'translate(-50%, -50%) scale(1)';
                flyingCard.style.opacity = '1';
            });

            // 飞行完成后移除
            setTimeout(() => {
                flyingCard.style.opacity = '0';
                flyingCard.style.transform = 'translate(-50%, -50%) scale(0.8)';
                setTimeout(() => flyingCard.remove(), 200);
            }, 350);

            if (dealtCount >= totalCards) {
                clearInterval(dealTimer);
                // 隐藏发牌堆
                setTimeout(() => {
                    if (dealPile) dealPile.style.display = 'none';
                    if (callback) callback();
                }, 500);
            }
        }, dealInterval);
    }

    /**
     * 出牌动画 - 选中牌从手牌区飞向出牌区
     * @param {Array} cards - 出牌数组
     * @param {HTMLElement} fromEl - 来源元素
     * @param {HTMLElement} toEl - 目标元素
     * @param {Function} callback - 动画完成回调
     */
    playAnimation(cards, fromEl, toEl, callback) {
        if (!toEl) {
            if (callback) callback();
            return;
        }

        // 出牌区播放出牌动画
        toEl.style.animation = 'none';
        toEl.offsetHeight; // 强制重排
        toEl.style.animation = 'playCard 0.4s ease-out';

        setTimeout(() => {
            if (callback) callback();
        }, 400);
    }

    /**
     * 胜利动画 - Canvas粒子烟花系统
     * @param {Function} callback - 动画完成回调
     */
    winAnimation(callback) {
        // 游戏桌面播放庆祝动画
        const gameTable = document.querySelector('.game-table');
        if (gameTable) {
            gameTable.style.animation = 'winCelebration 1.5s ease-in-out';
            setTimeout(() => {
                gameTable.style.animation = '';
            }, 1500);
        }

        // 创建烟花Canvas
        this._createFireworksCanvas();

        // 发射多轮烟花
        const rounds = 5;
        for (let r = 0; r < rounds; r++) {
            setTimeout(() => {
                this._launchFirework(
                    Math.random() * window.innerWidth,
                    Math.random() * window.innerHeight * 0.6
                );
            }, r * 500);
        }

        // 3秒后清理
        setTimeout(() => {
            this._stopFireworks();
            if (callback) callback();
        }, 3000);
    }

    /**
     * 创建烟花Canvas
     */
    _createFireworksCanvas() {
        if (this.fireworksCanvas) {
            this.fireworksCanvas.remove();
        }

        this.fireworksCanvas = document.createElement('canvas');
        this.fireworksCanvas.className = 'fireworks-canvas';
        this.fireworksCanvas.width = window.innerWidth;
        this.fireworksCanvas.height = window.innerHeight;
        document.body.appendChild(this.fireworksCanvas);

        this.fireworksCtx = this.fireworksCanvas.getContext('2d');
        this.particles = [];

        // 启动动画循环
        this._animateFireworks();
    }

    /**
     * 发射一枚烟花
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    _launchFirework(x, y) {
        const colors = [
            '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
            '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const particleCount = 40 + Math.floor(Math.random() * 30);

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            const speed = 2 + Math.random() * 4;
            const size = 1.5 + Math.random() * 2.5;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color,
                alpha: 1,
                decay: 0.012 + Math.random() * 0.015,
                gravity: 0.04
            });
        }
    }

    /**
     * 烟花动画循环
     */
    _animateFireworks() {
        if (!this.fireworksCtx) return;

        this.fireworksCtx.globalCompositeOperation = 'destination-out';
        this.fireworksCtx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        this.fireworksCtx.fillRect(0, 0, this.fireworksCanvas.width, this.fireworksCanvas.height);

        this.fireworksCtx.globalCompositeOperation = 'lighter';

        this.particles = this.particles.filter(p => p.alpha > 0.01);

        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.99;
            p.alpha -= p.decay;

            this.fireworksCtx.beginPath();
            this.fireworksCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.fireworksCtx.fillStyle = p.color;
            this.fireworksCtx.globalAlpha = Math.max(0, p.alpha);
            this.fireworksCtx.fill();
        });

        this.fireworksCtx.globalAlpha = 1;

        this.fireworksAnimId = requestAnimationFrame(() => this._animateFireworks());
    }

    /**
     * 停止烟花动画
     */
    _stopFireworks() {
        if (this.fireworksAnimId) {
            cancelAnimationFrame(this.fireworksAnimId);
            this.fireworksAnimId = null;
        }
        if (this.fireworksCanvas) {
            this.fireworksCanvas.style.transition = 'opacity 0.5s ease';
            this.fireworksCanvas.style.opacity = '0';
            setTimeout(() => {
                if (this.fireworksCanvas) {
                    this.fireworksCanvas.remove();
                    this.fireworksCanvas = null;
                    this.fireworksCtx = null;
                }
            }, 500);
        }
        this.particles = [];
    }

    /**
     * 失败动画 - 抖动+渐暗
     * @param {Function} callback - 动画完成回调
     */
    loseAnimation(callback) {
        const gameTable = document.querySelector('.game-table');
        if (gameTable) {
            gameTable.style.animation = 'loseShake 0.8s ease-in-out';

            // 渐暗效果
            setTimeout(() => {
                gameTable.style.filter = 'brightness(0.6)';
                gameTable.style.transition = 'filter 0.5s ease';
            }, 800);

            // 恢复
            setTimeout(() => {
                gameTable.style.animation = '';
                gameTable.style.filter = '';
                gameTable.style.transition = '';
                if (callback) callback();
            }, 1500);
        } else {
            if (callback) callback();
        }
    }

    /**
     * 炸弹特效 - 缩放脉冲+屏幕闪烁
     * @param {Function} callback - 动画完成回调
     */
    bombEffect(callback) {
        // 屏幕闪烁
        if (this.screenFlash) {
            this.screenFlash.classList.add('flash');
            setTimeout(() => {
                this.screenFlash.classList.remove('flash');
            }, 150);
        }

        // 出牌区缩放脉冲
        const playArea = document.querySelector('.play-area');
        if (playArea) {
            playArea.style.animation = 'bombEffect 0.8s ease-out';
            setTimeout(() => {
                playArea.style.animation = '';
            }, 800);
        }

        // 屏幕震动
        const gameTable = document.querySelector('.game-table');
        if (gameTable) {
            gameTable.style.animation = 'loseShake 0.5s ease-in-out';
            setTimeout(() => {
                gameTable.style.animation = '';
            }, 500);
        }

        setTimeout(() => {
            if (callback) callback();
        }, 800);
    }

    /**
     * 火箭特效 - 火箭升空+爆炸
     * @param {Function} callback - 动画完成回调
     */
    rocketEffect(callback) {
        // 先播放炸弹特效
        this.bombEffect(() => {});

        // 创建火箭元素
        const rocket = document.createElement('div');
        rocket.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: 10%;
            transform: translateX(-50%);
            font-size: 48px;
            z-index: 100;
            animation: rocketEffect 1s ease-in forwards;
            pointer-events: none;
        `;
        rocket.textContent = '🚀';
        document.body.appendChild(rocket);

        // 火箭升空后爆炸烟花
        setTimeout(() => {
            this._createFireworksCanvas();
            // 在顶部爆炸
            this._launchFirework(window.innerWidth / 2, window.innerHeight * 0.2);
            this._launchFirework(window.innerWidth / 2 - 50, window.innerHeight * 0.25);
            this._launchFirework(window.innerWidth / 2 + 50, window.innerHeight * 0.25);
        }, 600);

        // 清理
        setTimeout(() => {
            rocket.remove();
            this._stopFireworks();
            if (callback) callback();
        }, 1500);
    }

    /**
     * 底牌翻转动画
     * @param {Array<HTMLElement>} elements - 需要翻转的牌元素数组
     * @param {Function} callback - 动画完成回调
     */
    flipCards(elements, callback) {
        if (!elements || elements.length === 0) {
            if (callback) callback();
            return;
        }

        elements.forEach((el, index) => {
            el.style.animation = `flipCard 0.6s ease-out ${index * 0.15}s both`;
        });

        // 等待所有翻转完成
        const totalDuration = 600 + (elements.length - 1) * 150;
        setTimeout(() => {
            elements.forEach(el => {
                el.style.animation = '';
            });
            if (callback) callback();
        }, totalDuration);
    }

    /**
     * 牌型提示浮现动画
     * @param {string} text - 提示文本
     * @param {HTMLElement} container - 容器元素
     */
    patternHint(text, container) {
        if (!container) return;

        // 清除之前的提示
        const existingHint = container.querySelector('.pattern-hint');
        if (existingHint) existingHint.remove();

        const hint = document.createElement('div');
        hint.className = 'pattern-hint';

        // 判断是否是炸弹/火箭
        if (text.includes('火箭')) {
            hint.classList.add('rocket');
            hint.textContent = `🚀 ${text}`;
        } else if (text.includes('炸弹')) {
            hint.classList.add('bomb');
            hint.textContent = `💥 ${text}`;
        } else {
            hint.textContent = text;
        }

        container.appendChild(hint);

        // 1.5秒后淡出
        setTimeout(() => {
            hint.style.transition = 'opacity 0.3s ease';
            hint.style.opacity = '0';
            setTimeout(() => hint.remove(), 300);
        }, 1500);
    }

    /**
     * 倒计时动画
     * @param {HTMLElement} element - 倒计时元素
     * @param {number} seconds - 倒计时秒数
     */
    countdownAnimation(element, seconds) {
        // 清除之前的倒计时
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }

        if (!element) return;

        let remaining = seconds;
        const totalDeg = 360;

        // 更新显示
        const updateDisplay = () => {
            const progress = remaining / seconds;
            const deg = totalDeg * progress;

            // 更新进度环
            const ringProgress = element.querySelector('.ring-progress');
            if (ringProgress) {
                ringProgress.style.setProperty('--progress-deg', `${deg}deg`);
                ringProgress.style.background = `conic-gradient(
                    ${remaining <= 5 ? '#ef4444' : '#fbbf24'} 0deg,
                    ${remaining <= 5 ? '#ef4444' : '#fbbf24'} ${deg}deg,
                    transparent ${deg}deg
                )`;
            }

            // 更新文字
            const ringText = element.querySelector('.ring-text');
            if (ringText) {
                ringText.textContent = remaining;
                // 最后5秒变红
                if (remaining <= 5) {
                    ringText.style.color = '#ef4444';
                    ringText.style.textShadow = '0 0 8px rgba(239, 68, 68, 0.5)';
                } else {
                    ringText.style.color = '#fbbf24';
                    ringText.style.textShadow = '0 0 8px rgba(251, 191, 36, 0.4)';
                }
            }

            // 最后3秒脉冲效果
            if (remaining <= 3) {
                element.style.animation = 'pulse 0.5s ease-in-out';
                setTimeout(() => {
                    element.style.animation = '';
                }, 500);
            }
        };

        updateDisplay();

        this.countdownTimer = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                // 倒计时结束事件
                element.dispatchEvent(new CustomEvent('countdownEnd'));
                return;
            }
            updateDisplay();
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
    }

    /**
     * 播放通用动画
     * @param {HTMLElement} element - 目标元素
     * @param {string} animationName - 动画名称
     * @param {number} duration - 动画时长(ms)
     * @param {Function} callback - 完成回调
     */
    playGenericAnimation(element, animationName, duration, callback) {
        if (!element) {
            if (callback) callback();
            return;
        }

        element.style.animation = `${animationName} ${duration}ms ease-out`;
        setTimeout(() => {
            element.style.animation = '';
            if (callback) callback();
        }, duration);
    }

    /**
     * 淡入动画
     * @param {HTMLElement} element - 目标元素
     * @param {number} duration - 动画时长(ms)
     * @param {Function} callback - 完成回调
     */
    fadeIn(element, duration = 300, callback) {
        if (!element) {
            if (callback) callback();
            return;
        }

        element.style.opacity = '0';
        element.style.display = '';
        element.style.transition = `opacity ${duration}ms ease`;

        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });

        setTimeout(() => {
            element.style.transition = '';
            if (callback) callback();
        }, duration);
    }

    /**
     * 淡出动画
     * @param {HTMLElement} element - 目标元素
     * @param {number} duration - 动画时长(ms)
     * @param {Function} callback - 完成回调
     */
    fadeOut(element, duration = 300, callback) {
        if (!element) {
            if (callback) callback();
            return;
        }

        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';

        setTimeout(() => {
            element.style.display = 'none';
            element.style.transition = '';
            if (callback) callback();
        }, duration);
    }
}

// 导出全局实例
window.AnimationEngine = AnimationEngine;
window.animationEngine = new AnimationEngine();