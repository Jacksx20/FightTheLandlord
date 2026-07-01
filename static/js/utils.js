/**
 * ============================================
 * 斗地主游戏 - 工具函数库
 * 提供通用的辅助方法
 * ============================================
 */

class Utils {
    /**
     * 生成唯一ID
     * @param {string} prefix - 前缀
     * @returns {string} 唯一ID
     */
    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
    }

    /**
     * 延迟执行（Promise包装的setTimeout）
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise} Promise对象
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 随机整数（包含min和max）
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机整数
     */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 随机延迟（模拟AI思考时间，1-2秒）
     * @returns {Promise} Promise对象
     */
    static async randomDelay() {
        const ms = Utils.randomInt(1000, 2000);
        await Utils.sleep(ms);
    }

    /**
     * 深拷贝对象
     * @param {*} obj - 待拷贝对象
     * @returns {*} 深拷贝结果
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = Utils.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * 防抖函数
     * @param {Function} fn - 目标函数
     * @param {number} delay - 延迟毫秒数
     * @returns {Function} 防抖后的函数
     */
    static debounce(fn, delay = 300) {
        let timer = null;
        return function (...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                fn.apply(this, args);
                timer = null;
            }, delay);
        };
    }

    /**
     * 节流函数
     * @param {Function} fn - 目标函数
     * @param {number} interval - 间隔毫秒数
     * @returns {Function} 节流后的函数
     */
    static throttle(fn, interval = 200) {
        let lastTime = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastTime >= interval) {
                fn.apply(this, args);
                lastTime = now;
            }
        };
    }

    /**
     * 格式化时间（秒 -> MM:SS）
     * @param {number} seconds - 秒数
     * @returns {string} 格式化时间字符串
     */
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 格式化百分比
     * @param {number} value - 数值
     * @param {number} total - 总数
     * @param {number} decimals - 小数位数
     * @returns {string} 百分比字符串
     */
    static formatPercent(value, total, decimals = 1) {
        if (total === 0) return '0%';
        return ((value / total) * 100).toFixed(decimals) + '%';
    }

    /**
     * 扑克牌排序（按点数从大到小）
     * 点数权重: 大王 > 小王 > 2 > A > K > Q > J > 10 > ... > 3
     * @param {Array} cards - 牌数组
     * @returns {Array} 排序后的牌数组
     */
    static sortCards(cards) {
        const rankWeight = {
            '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
            '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
            'SMALL_JOKER': 16, 'BIG_JOKER': 17
        };
        return [...cards].sort((a, b) => {
            const wa = rankWeight[a.rank] || 0;
            const wb = rankWeight[b.rank] || 0;
            if (wb !== wa) return wb - wa;
            // 同点数按花色排序
            const suitOrder = { '♠': 4, '♥': 3, '♣': 2, '♦': 1 };
            return (suitOrder[b.suit] || 0) - (suitOrder[a.suit] || 0);
        });
    }

    /**
     * 获取牌型名称（中文）
     * @param {string} pattern - 牌型标识
     * @returns {string} 牌型中文名
     */
    static getPatternName(pattern) {
        const names = {
            'single': '单张',
            'pair': '对子',
            'triple': '三条',
            'triple_with_single': '三带一',
            'triple_with_pair': '三带二',
            'straight': '顺子',
            'straight_pair': '连对',
            'airplane': '飞机',
            'airplane_with_singles': '飞机带单',
            'airplane_with_pairs': '飞机带双',
            'bomb': '炸弹',
            'rocket': '火箭',
            'four_with_two_singles': '四带二',
            'four_with_two_pairs': '四带两对'
        };
        return names[pattern] || pattern || '未知牌型';
    }

    /**
     * 获取角色名称
     * @param {string} role - 角色标识
     * @returns {string} 角色中文名
     */
    static getRoleName(role) {
        const names = {
            'landlord': '地主',
            'farmer': '农民',
            'none': '未定'
        };
        return names[role] || '未定';
    }

    /**
     * 获取角色图标
     * @param {string} role - 角色标识
     * @returns {string} 角色图标
     */
    static getRoleIcon(role) {
        const icons = {
            'landlord': '👑',
            'farmer': '🌾',
            'none': '❓'
        };
        return icons[role] || '❓';
    }

    /**
     * 获取玩家名称
     * @param {number} playerId - 玩家ID（0=玩家，1=AI左，2=AI右）
     * @returns {string} 玩家名称
     */
    static getPlayerName(playerId) {
        const names = {
            0: '你',
            1: 'AI·左',
            2: 'AI·右'
        };
        return names[playerId] || `玩家${playerId}`;
    }

    /**
     * 获取玩家头像图标
     * @param {number} playerId - 玩家ID
     * @returns {string} 头像emoji
     */
    static getPlayerAvatar(playerId) {
        const avatars = {
            0: '😎',
            1: '🤖',
            2: '🤖'
        };
        return avatars[playerId] || '👤';
    }

    /**
     * 安全获取DOM元素
     * @param {string} id - 元素ID
     * @returns {HTMLElement|null} DOM元素
     */
    static $(id) {
        return document.getElementById(id);
    }

    /**
     * 安全查询DOM元素
     * @param {string} selector - CSS选择器
     * @param {HTMLElement} parent - 父元素
     * @returns {HTMLElement|null} DOM元素
     */
    static $q(selector, parent = document) {
        return parent.querySelector(selector);
    }

    /**
     * 安全查询所有DOM元素
     * @param {string} selector - CSS选择器
     * @param {HTMLElement} parent - 父元素
     * @returns {NodeList} DOM元素列表
     */
    static $qa(selector, parent = document) {
        return parent.querySelectorAll(selector);
    }

    /**
     * 显示元素
     * @param {HTMLElement|string} el - 元素或ID
     */
    static show(el) {
        const element = typeof el === 'string' ? Utils.$(el) : el;
        if (element) element.style.display = '';
    }

    /**
     * 隐藏元素
     * @param {HTMLElement|string} el - 元素或ID
     */
    static hide(el) {
        const element = typeof el === 'string' ? Utils.$(el) : el;
        if (element) element.style.display = 'none';
    }

    /**
     * 切换元素可见性
     * @param {HTMLElement|string} el - 元素或ID
     */
    static toggle(el) {
        const element = typeof el === 'string' ? Utils.$(el) : el;
        if (!element) return;
        element.style.display = element.style.display === 'none' ? '' : 'none';
    }

    /**
     * 添加CSS类
     * @param {HTMLElement|string} el - 元素或ID
     * @param {string} className - 类名
     */
    static addClass(el, className) {
        const element = typeof el === 'string' ? Utils.$(el) : el;
        if (element) element.classList.add(className);
    }

    /**
     * 移除CSS类
     * @param {HTMLElement|string} el - 元素或ID
     * @param {string} className - 类名
     */
    static removeClass(el, className) {
        const element = typeof el === 'string' ? Utils.$(el) : el;
        if (element) element.classList.remove(className);
    }

    /**
     * 切换CSS类
     * @param {HTMLElement|string} el - 元素或ID
     * @param {string} className - 类名
     */
    static toggleClass(el, className) {
        const element = typeof el === 'string' ? Utils.$(el) : el;
        if (element) element.classList.toggle(className);
    }

    /**
     * 显示Toast提示
     * @param {string} message - 提示消息
     * @param {string} type - 类型: success/error/warning/info
     * @param {number} duration - 显示时长(ms)
     */
    static toast(message, type = 'info', duration = 2000) {
        // 移除已有toast
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';

        // 类型图标和颜色
        const config = {
            success: { icon: '✅', color: '#34d399' },
            error: { icon: '❌', color: '#ef4444' },
            warning: { icon: '⚠️', color: '#fbbf24' },
            info: { icon: '💡', color: '#818cf8' }
        };
        const { icon, color } = config[type] || config.info;

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            z-index: 1000;
            padding: 12px 24px;
            border-radius: 12px;
            background: rgba(30, 30, 60, 0.92);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid ${color}40;
            color: #f1f5f9;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: fadeInUp 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
        `;
        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        document.body.appendChild(toast);

        // 自动消失
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * 限制数值范围
     * @param {number} value - 数值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 限制后的值
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * 判断对象是否为空
     * @param {Object} obj - 对象
     * @returns {boolean} 是否为空
     */
    static isEmpty(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    }
}

// 导出全局
window.Utils = Utils;
