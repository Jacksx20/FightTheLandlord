/**
 * ============================================
 * 斗地主游戏 - 扑克牌渲染器
 * 纯CSS绘制扑克牌，不依赖任何图片资源
 * ============================================
 */

class CardRenderer {
    constructor() {
        // 花色映射
        this.SUIT_SYMBOLS = {
            '♠': '♠', '♥': '♥', '♣': '♣', '♦': '♦',
            'joker': '🃏'
        };

        // 红色花色集合
        this.RED_SUITS = new Set(['♥', '♦']);

        // 点数显示映射
        this.RANK_DISPLAY = {
            '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
            '8': '8', '9': '9', '10': '10', 'J': 'J', 'Q': 'Q',
            'K': 'K', 'A': 'A', '2': '2',
            'SMALL_JOKER': '小',
            'BIG_JOKER': '大'
        };

        // 王牌花色显示
        this.JOKER_SUIT_DISPLAY = {
            'SMALL_JOKER': '☆',
            'BIG_JOKER': '★'
        };
    }

    /**
     * 渲染单张扑克牌
     * @param {Object} card - 牌对象 {id, suit, rank, face_up}
     * @param {Object} options - 渲染选项 {selected, small, clickable}
     * @returns {HTMLElement} 扑克牌DOM元素
     */
    render(card, options = {}) {
        const {
            selected = false,
            small = false,
            clickable = true
        } = options;

        // 创建牌容器
        const cardEl = document.createElement('div');

        // 判断是否正面朝上
        if (card.faceUp === false) {
            cardEl.className = `card face-down${small ? ' small' : ''}`;
            cardEl.dataset.cardId = card.id;
            return cardEl;
        }

        // 判断花色类型
        const isJoker = card.rank === 'SMALL_JOKER' || card.rank === 'BIG_JOKER';
        const isRed = !isJoker && this.RED_SUITS.has(card.suit);

        // 构建CSS类名
        let classNames = ['card'];
        if (isRed) classNames.push('red');
        else if (isJoker) classNames.push(card.rank === 'SMALL_JOKER' ? 'joker-small' : 'joker-big');
        else classNames.push('black');

        if (selected) classNames.push('selected');
        if (small) classNames.push('small');
        if (!clickable) classNames.push('no-hover');

        cardEl.className = classNames.join(' ');
        cardEl.dataset.cardId = card.id;
        cardEl.dataset.suit = card.suit;
        cardEl.dataset.rank = card.rank;

        // 渲染牌面内容
        const rankDisplay = this.RANK_DISPLAY[card.rank] || card.rank;
        const suitDisplay = isJoker
            ? (this.JOKER_SUIT_DISPLAY[card.rank] || '🃏')
            : card.suit;
        const centerSuit = isJoker
            ? (card.rank === 'BIG_JOKER' ? '★' : '☆')
            : card.suit;

        // 左上角 - 点数 + 花色
        const cornerTop = document.createElement('div');
        cornerTop.className = 'card-corner-top';
        cornerTop.innerHTML = `
            <span class="card-rank">${rankDisplay}</span>
            <span class="card-suit-small">${suitDisplay}</span>
        `;

        // 中央大花色
        const centerEl = document.createElement('div');
        centerEl.className = 'card-center-suit';
        centerEl.textContent = centerSuit;

        // 右下角 - 点数 + 花色（旋转180度）
        const cornerBottom = document.createElement('div');
        cornerBottom.className = 'card-corner-bottom';
        cornerBottom.innerHTML = `
            <span class="card-rank">${rankDisplay}</span>
            <span class="card-suit-small">${suitDisplay}</span>
        `;

        cardEl.appendChild(cornerTop);
        cardEl.appendChild(centerEl);
        cardEl.appendChild(cornerBottom);

        return cardEl;
    }

    /**
     * 渲染手牌（扇形排列，重叠效果）
     * @param {Array} cards - 手牌数组
     * @param {string} containerId - 容器元素ID
     */
    renderHand(cards, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // 清空容器
        container.innerHTML = '';

        // 创建手牌容器
        const handCards = document.createElement('div');
        handCards.className = 'hand-cards';

        const cardCount = cards.length;

        cards.forEach((card, index) => {
            // 创建牌包装器（用于控制重叠和扇形）
            const wrapper = document.createElement('div');
            wrapper.className = 'card-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.zIndex = index;

            // 计算重叠偏移：牌数多时重叠更多
            const maxVisibleWidth = Math.min(
                window.innerWidth - 80,
                cardCount * 55
            );
            const overlap = cardCount > 1
                ? Math.max(20, (maxVisibleWidth - 70) / (cardCount - 1))
                : 70;
            const offset = index * Math.min(overlap, 55);

            wrapper.style.marginLeft = index === 0 ? '0' : `-${70 - Math.min(overlap, 55)}px`;

            // 计算扇形旋转角度（中间牌不旋转，两侧微微旋转）
            const centerIndex = (cardCount - 1) / 2;
            const rotation = (index - centerIndex) * 0.5; // 每张牌0.5度旋转
            const verticalOffset = Math.abs(index - centerIndex) * 1.5; // 弧形偏移

            wrapper.style.transform = `rotate(${rotation}deg) translateY(${verticalOffset}px)`;

            // 渲染扑克牌
            const cardEl = this.render(card, {
                selected: card._selected || false,
                clickable: true
            });

            // 点击选牌事件
            cardEl.addEventListener('click', () => {
                card._selected = !card._selected;
                cardEl.classList.toggle('selected');
                // 触发自定义事件
                container.dispatchEvent(new CustomEvent('cardSelect', {
                    detail: { card, selected: card._selected }
                }));
            });

            wrapper.appendChild(cardEl);
            handCards.appendChild(wrapper);
        });

        container.appendChild(handCards);
    }

    /**
     * 渲染出牌区
     * @param {Array} cards - 出牌数组
     * @param {string} containerId - 容器元素ID
     */
    renderPlayArea(cards, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (!cards || cards.length === 0) {
            // 空状态
            const placeholder = document.createElement('span');
            placeholder.className = 'play-area-placeholder';
            placeholder.textContent = '等待出牌...';
            container.appendChild(placeholder);
            return;
        }

        // 创建出牌容器
        const playCards = document.createElement('div');
        playCards.className = 'flex items-center justify-center gap-1 flex-wrap';

        cards.forEach(card => {
            const cardEl = this.render(card, {
                selected: false,
                small: true,
                clickable: false
            });
            // 出牌动画
            cardEl.style.animation = 'playCard 0.4s ease-out';
            playCards.appendChild(cardEl);
        });

        container.appendChild(playCards);
    }

    /**
     * 渲染过牌状态
     * @param {string} containerId - 容器元素ID
     */
    renderPass(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        const passText = document.createElement('span');
        passText.className = 'pass-text';
        passText.textContent = '不出';
        passText.style.animation = 'fadeInUp 0.3s ease-out';
        container.appendChild(passText);
    }

    /**
     * 渲染牌背面（AI手牌数显示）
     * @param {number} count - 牌数量
     * @param {string} containerId - 容器元素ID
     */
    renderBack(count, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        // 显示最多5张背面牌 + 数量标识
        const displayCount = Math.min(count, 5);
        const backContainer = document.createElement('div');
        backContainer.className = 'flex items-center';

        for (let i = 0; i < displayCount; i++) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card face-down small';
            cardEl.style.marginLeft = i === 0 ? '0' : '-30px';
            cardEl.style.zIndex = i;
            backContainer.appendChild(cardEl);
        }

        // 数量标识
        if (count > 0) {
            const countBadge = document.createElement('span');
            countBadge.className = 'ml-2 text-sm font-bold text-amber-400';
            countBadge.textContent = `×${count}`;
            backContainer.appendChild(countBadge);
        }

        container.appendChild(backContainer);
    }

    /**
     * 渲染底牌区
     * @param {Array} cards - 底牌数组（3张）
     * @param {boolean} revealed - 是否已公开
     * @param {string} containerId - 容器元素ID
     */
    renderHiddenCards(cards, revealed, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        const hiddenContainer = document.createElement('div');
        hiddenContainer.className = 'hidden-cards';

        cards.forEach((card, index) => {
            const cardEl = this.render(
                { ...card, faceUp: revealed },
                { selected: false, small: true, clickable: false }
            );

            // 翻牌动画延迟
            if (revealed) {
                cardEl.style.animation = `flipCard 0.6s ease-out ${index * 0.15}s both`;
            }

            hiddenContainer.appendChild(cardEl);
        });

        container.appendChild(hiddenContainer);
    }

    /**
     * 更新手牌选中状态（不重新渲染整个手牌）
     * @param {Array} cards - 手牌数组
     * @param {string} containerId - 容器元素ID
     */
    updateSelection(cards, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const cardElements = container.querySelectorAll('.card[data-card-id]');
        cardElements.forEach(el => {
            const cardId = parseInt(el.dataset.cardId);
            const card = cards.find(c => c.id === cardId);
            if (card) {
                el.classList.toggle('selected', card._selected || false);
            }
        });
    }

    /**
     * 获取当前选中的牌ID列表
     * @param {Array} cards - 手牌数组
     * @returns {Array} 选中的牌ID数组
     */
    getSelectedCardIds(cards) {
        return cards
            .filter(card => card._selected)
            .map(card => card.id);
    }

    /**
     * 清除所有选中状态
     * @param {Array} cards - 手牌数组
     * @param {string} containerId - 容器元素ID
     */
    clearSelection(cards, containerId) {
        cards.forEach(card => { card._selected = false; });
        this.updateSelection(cards, containerId);
    }
}

// 导出全局实例
window.CardRenderer = CardRenderer;
window.cardRenderer = new CardRenderer();