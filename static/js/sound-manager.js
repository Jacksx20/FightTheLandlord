/**
 * ============================================
 * 斗地主游戏 - 音效管理器
 * 使用Web Audio API生成简单音效
 * ============================================
 */

class SoundManager {
    constructor() {
        /** @type {boolean} 音效是否启用 */
        this.enabled = true;
        /** @type {AudioContext|null} Web Audio上下文 */
        this.audioCtx = null;
    }

    /**
     * 初始化AudioContext（需要用户交互后调用）
     */
    _init() {
        if (!this.audioCtx) {
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('[SoundManager] Web Audio API不可用');
                this.enabled = false;
            }
        }
    }

    /**
     * 播放指定音效
     * @param {string} soundName - 音效名称
     */
    play(soundName) {
        if (!this.enabled) return;
        this._init();
        if (!this.audioCtx) return;

        const soundMap = {
            'deal': () => this._playTone(800, 0.05, 'square', 0.1),
            'play': () => this._playTone(600, 0.1, 'sine', 0.15),
            'pass': () => this._playTone(300, 0.15, 'sine', 0.1),
            'bid': () => this._playTone(900, 0.1, 'triangle', 0.15),
            'bomb': () => this._playBomb(),
            'rocket': () => this._playRocket(),
            'win': () => this._playWin(),
            'lose': () => this._playLose(),
            'select': () => this._playTone(1200, 0.03, 'sine', 0.05),
            'error': () => this._playTone(200, 0.2, 'sawtooth', 0.1),
            'countdown': () => this._playTone(1000, 0.05, 'sine', 0.08),
        };

        const playFn = soundMap[soundName];
        if (playFn) {
            try { playFn(); } catch (e) { /* 静默处理 */ }
        }
    }

    /**
     * 播放基础音调
     * @param {number} freq - 频率
     * @param {number} duration - 时长(秒)
     * @param {string} type - 波形类型
     * @param {number} volume - 音量(0-1)
     */
    _playTone(freq, duration, type = 'sine', volume = 0.15) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = volume;
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    /**
     * 播放炸弹音效 - 低频轰鸣
     */
    _playBomb() {
        this._playTone(100, 0.5, 'sawtooth', 0.2);
        setTimeout(() => this._playTone(80, 0.3, 'square', 0.15), 100);
        setTimeout(() => this._playTone(60, 0.4, 'sawtooth', 0.1), 200);
    }

    /**
     * 播放火箭音效 - 上升音调
     */
    _playRocket() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, this.audioCtx.currentTime + 0.8);
        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 1);
    }

    /**
     * 播放胜利音效 - 上升和弦
     */
    _playWin() {
        [0, 150, 300, 450].forEach((delay, i) => {
            setTimeout(() => this._playTone(523 * (1 + i * 0.25), 0.3, 'sine', 0.12), delay);
        });
    }

    /**
     * 播放失败音效 - 下降音调
     */
    _playLose() {
        this._playTone(400, 0.3, 'sine', 0.12);
        setTimeout(() => this._playTone(300, 0.3, 'sine', 0.12), 200);
        setTimeout(() => this._playTone(200, 0.5, 'sine', 0.1), 400);
    }

    /**
     * 切换音效开关
     * @returns {boolean} 切换后的启用状态
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * 设置音效启用状态
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// 导出全局
window.SoundManager = SoundManager;