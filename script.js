// 戰棋遊戲主程式

// 遊戲配置
const GAME_CONFIG = {
    // 戰鬥網格配置
    GRID_COLS: 12,  // 網格列數
    GRID_ROWS: 8,   // 網格行數
    CELL_SIZE: 200,  // 每個格子的大小(像素) - 放大4倍 (50 * 4 = 200)
    
    // 角色配置
    CHAR_SPRITE_W: 20,  // 每個角色圖片寬度
    CHAR_SPRITE_H: 32,  // 每個角色圖片高度
    SPRITE_SHEET_COLS: 3, // 精靈圖每排的圖片數量
    SPRITE_SHEET_ROWS: 4, // 精靈圖的排數
    
    // 動畫配置
    ANIMATION_SPEED: 300, // 每幀動畫間隔（毫秒）
    
    // 方向常數
    DIRECTION: {
        DOWN: 0,  // 朝下
        LEFT: 1,  // 朝左
        RIGHT: 2, // 朝右
        UP: 3     // 朝上
    }
};

// 角色類別
class Character {
    constructor(gridX, gridY, spriteImage, stats = {}, isEnemy = false) {
        this.gridX = gridX;      // 網格座標 X
        this.gridY = gridY;      // 網格座標 Y
        this.spriteImage = spriteImage;  // 角色圖片
        this.isLoaded = false;   // 圖片是否載入完成
        this.isEnemy = isEnemy;  // 是否為敵人
        
        // 動畫相關屬性
        this.facing = GAME_CONFIG.DIRECTION.DOWN; // 當前朝向
        this.animationFrame = 0; // 當前動畫幀 (從0開始：0=左腳, 1=併攏, 2=右腳)
        this.animationSequenceIndex = 0; // 動畫序列中的當前索引
        this.lastAnimationTime = 0; // 上次動畫更新時間
        this.isAnimating = true; // 是否播放動畫
        
        // 移動動畫相關
        this.isMoving = false; // 是否正在移動
        this.movePath = []; // 移動路徑
        this.moveStartTime = 0; // 移動開始時間
        this.moveDuration = 500; // 移動時間（毫秒）
        this.moveStartX = 0; // 移動開始的X座標
        this.moveStartY = 0; // 移動開始的Y座標
        this.moveTargetX = 0; // 移動目標的X座標
        this.moveTargetY = 0; // 移動目標的Y座標
        this.renderX = gridX; // 渲染用的X座標（支援小數）
        this.renderY = gridY; // 渲染用的Y座標（支援小數）
        
        // 角色屬性
        this.stats = {
            hp: stats.hp || 100,           // 當前生命值
            maxhp: stats.maxhp || 100,     // 最大生命值
            mp: stats.mp || 50,            // 當前魔力值
            maxmp: stats.maxmp || 50,      // 最大魔力值
            str: stats.str || 15,          // 力量 (物理攻擊力)
            def: stats.def || 10,          // 防禦 (物理防禦力)
            mstr: stats.mstr || 12,        // 魔力 (魔法攻擊力)
            mdef: stats.mdef || 8,         // 魔防 (魔法防禦力)
            spd: stats.spd || 5,           // 速度
            mv: stats.mv || 3,             // 移動力
            range: stats.range || 1        // 攻擊射程
        };
        
        // 速度制系統相關
        this.waitTime = 0;              // 等待時間
        this.hasActed = false;          // 本輪是否已行動
    }
    
    // 更新動畫
    updateAnimation() {
        if (!this.isAnimating) return;
        
        const currentTime = Date.now();
        if (currentTime - this.lastAnimationTime >= GAME_CONFIG.ANIMATION_SPEED) {
            // 動畫序列：左腳(0) -> 併攏(1) -> 右腳(2) -> 併攏(1) -> 循環
            const animationSequence = [0, 2];//[0, 1, 2, 1];
            
            // 移動到下一個索引
            this.animationSequenceIndex = (this.animationSequenceIndex + 1) % animationSequence.length;
            
            // 設定對應的動畫幀
            this.animationFrame = animationSequence[this.animationSequenceIndex];
            
            this.lastAnimationTime = currentTime;
        }
    }
    
    // 設定角色朝向
    setFacing(direction) {
        this.facing = direction;
    }
    
    // 開始/停止動畫
    setAnimating(isAnimating) {
        this.isAnimating = isAnimating;
        if (!isAnimating) {
            this.animationFrame = 1; // 停止時回到併攏狀態
        }
    }
    
    // 開始移動動畫
    startMovingTo(targetX, targetY, onComplete = null) {
        // 如果已經在目標位置，直接完成
        if (this.gridX === targetX && this.gridY === targetY) {
            if (onComplete) onComplete();
            return;
        }
        
        // 計算完整的移動路徑
        this.movePath = this.calculateMovePath(this.gridX, this.gridY, targetX, targetY);
        
        if (this.movePath.length === 0) {
            if (onComplete) onComplete();
            return;
        }
        
        this.isMoving = true;
        this.moveStartTime = Date.now();
        this.onMoveComplete = onComplete;
        
        // 設定整個路徑的起點和終點
        this.moveStartX = this.gridX;
        this.moveStartY = this.gridY;
        this.moveTargetX = targetX;
        this.moveTargetY = targetY;
        
        // 初始化渲染座標
        this.renderX = this.gridX;
        this.renderY = this.gridY;
        
        // 設定朝向（基於整體移動方向）
        this.setFacingFromMovement(targetX - this.gridX, targetY - this.gridY);
        
        // 計算總移動時間（整個路徑一次完成）
        const totalDistance = this.movePath.length;
        this.moveDuration = Math.max(200, totalDistance * 120); // 每格120ms，最少200ms
    }
    
    // 根據整體移動方向設定朝向
    setFacingFromMovement(deltaX, deltaY) {
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            // 垂直移動優先
            this.facing = deltaY > 0 ? GAME_CONFIG.DIRECTION.DOWN : GAME_CONFIG.DIRECTION.UP;
        } else if (deltaX !== 0) {
            // 水平移動
            this.facing = deltaX > 0 ? GAME_CONFIG.DIRECTION.RIGHT : GAME_CONFIG.DIRECTION.LEFT;
        }
    }

    // 計算移動路徑（L形路徑：先水平後垂直）
    calculateMovePath(startX, startY, endX, endY) {
        const path = [];
        let currentX = startX;
        let currentY = startY;
        
        // 先水平移動
        while (currentX !== endX) {
            const deltaX = currentX < endX ? 1 : -1;
            path.push({ x: currentX + deltaX, y: currentY });
            currentX += deltaX;
        }
        
        // 再垂直移動
        while (currentY !== endY) {
            const deltaY = currentY < endY ? 1 : -1;
            path.push({ x: currentX, y: currentY + deltaY });
            currentY += deltaY;
        }
        
        return path;
    }
    
    // 更新移動動畫
    updateMovement() {
        if (!this.isMoving) {
            // 確保渲染座標與網格座標同步
            this.renderX = this.gridX;
            this.renderY = this.gridY;
            return;
        }
        
        const currentTime = Date.now();
        const elapsed = currentTime - this.moveStartTime;
        const progress = Math.min(elapsed / this.moveDuration, 1);
        
        if (this.movePath && this.movePath.length > 0) {
            // 沿路徑平滑移動
            const totalSegments = this.movePath.length;
            const currentSegmentFloat = progress * totalSegments;
            const currentSegmentIndex = Math.floor(currentSegmentFloat);
            const segmentProgress = currentSegmentFloat - currentSegmentIndex;
            
            let startX, startY, endX, endY;
            
            if (currentSegmentIndex === 0) {
                // 第一段：從起始位置到第一個路徑點
                startX = this.moveStartX;
                startY = this.moveStartY;
                endX = this.movePath[0].x;
                endY = this.movePath[0].y;
            } else if (currentSegmentIndex >= totalSegments) {
                // 最後到達目標
                startX = endX = this.moveTargetX;
                startY = endY = this.moveTargetY;
            } else {
                // 中間段：從前一個路徑點到當前路徑點
                startX = this.movePath[currentSegmentIndex - 1].x;
                startY = this.movePath[currentSegmentIndex - 1].y;
                endX = this.movePath[currentSegmentIndex].x;
                endY = this.movePath[currentSegmentIndex].y;
            }
            
            // 使用線性插值在當前段內移動
            this.renderX = startX + (endX - startX) * segmentProgress;
            this.renderY = startY + (endY - startY) * segmentProgress;
        }
        
        // 移動完成
        if (progress >= 1) {
            this.isMoving = false;
            this.gridX = this.moveTargetX;
            this.gridY = this.moveTargetY;
            this.renderX = this.gridX;
            this.renderY = this.gridY;
            this.facing = GAME_CONFIG.DIRECTION.DOWN; // 恢復朝下
            
            if (this.onMoveComplete) {
                this.onMoveComplete();
                this.onMoveComplete = null;
            }
        }
    }
    
    // 緩動函數（二次方緩入緩出）
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    // 取得角色狀態資訊
    getStatusInfo() {
        return {
            type: this.isEnemy ? '敵人' : '我方',
            hp: `${this.stats.hp}/${this.stats.maxhp}`,
            mp: `${this.stats.mp}/${this.stats.maxmp}`,
            str: this.stats.str,
            def: this.stats.def,
            mstr: this.stats.mstr,
            mdef: this.stats.mdef,
            spd: this.stats.spd,
            mv: this.stats.mv,
            range: this.stats.range
        };
    }
    
    // 設定角色屬性
    setStats(newStats) {
        Object.assign(this.stats, newStats);
        // 確保當前值不超過最大值
        this.stats.hp = Math.min(this.stats.hp, this.stats.maxhp);
        this.stats.mp = Math.min(this.stats.mp, this.stats.maxmp);
    }
    
    // 受到傷害
    takeDamage(damage) {
        this.stats.hp = Math.max(0, this.stats.hp - damage);
        return this.stats.hp <= 0; // 返回是否死亡
    }
    
    // 恢復生命值
    heal(amount) {
        this.stats.hp = Math.min(this.stats.maxhp, this.stats.hp + amount);
    }
    
    // 消耗魔力
    consumeMP(amount) {
        if (this.stats.mp >= amount) {
            this.stats.mp -= amount;
            return true; // 成功消耗
        }
        return false; // 魔力不足
    }
    
    // 恢復魔力
    restoreMP(amount) {
        this.stats.mp = Math.min(this.stats.maxmp, this.stats.mp + amount);
    }
    
    // 檢查是否存活
    isAlive() {
        return this.stats.hp > 0;
    }
    
    // 繪製角色
    draw(ctx, offsetX = 0, offsetY = 0) {
        if (!this.isLoaded || !this.spriteImage) return;
        
        // 更新動畫和移動
        this.updateAnimation();
        this.updateMovement();
        
        // 設置像素完美渲染
        ctx.imageSmoothingEnabled = false;
        
        // 計算格子的基礎位置（使用渲染座標支援平滑移動）
        const cellX = this.renderX * GAME_CONFIG.CELL_SIZE + offsetX;
        const cellY = this.renderY * GAME_CONFIG.CELL_SIZE + offsetY;
        
        // 計算角色圖片的原始比例
        const spriteAspectRatio = GAME_CONFIG.CHAR_SPRITE_W / GAME_CONFIG.CHAR_SPRITE_H;
        
        // 設定角色大小為格子的80%，並保持比例
        const maxSize = GAME_CONFIG.CELL_SIZE * 0.8;
        let charWidth, charHeight;
        
        if (spriteAspectRatio > 1) {
            // 寬度較大，以寬度為準
            charWidth = maxSize;
            charHeight = maxSize / spriteAspectRatio;
        } else {
            // 高度較大，以高度為準
            charHeight = maxSize;
            charWidth = maxSize * spriteAspectRatio;
        }
        
        // 計算置中位置
        const charX = cellX + (GAME_CONFIG.CELL_SIZE - charWidth) / 2;
        const charY = cellY + (GAME_CONFIG.CELL_SIZE - charHeight) / 2;
        
        // 計算精靈圖中的位置
        const spriteX = this.animationFrame * GAME_CONFIG.CHAR_SPRITE_W;
        const spriteY = this.facing * GAME_CONFIG.CHAR_SPRITE_H;
        
        // 從精靈圖中擷取指定區域並繪製到置中位置
        ctx.drawImage(
            this.spriteImage,
            spriteX,                       // 源圖 X (根據動畫幀)
            spriteY,                       // 源圖 Y (根據朝向)
            GAME_CONFIG.CHAR_SPRITE_W,     // 源圖寬度
            GAME_CONFIG.CHAR_SPRITE_H,     // 源圖高度
            charX,                         // 目標 X (置中)
            charY,                         // 目標 Y (置中)
            charWidth,                     // 目標寬度 (保持比例)
            charHeight                     // 目標高度 (保持比例)
        );
        
        // 恢復默認設置
        ctx.imageSmoothingEnabled = true;
        
        // 繪製血條
        this.drawHealthBar(ctx, charX, charY, charWidth, charHeight);
    }
    
    // 繪製血條
    drawHealthBar(ctx, charX, charY, charWidth, charHeight) {
        const barWidth = charWidth * 0.9; // 血條寬度為角色寬度的90%
        const barHeight = charHeight * 0.08; // 血條高度為角色高度的8%
        const barX = charX + (charWidth - barWidth) / 2; // 置中
        const barY = charY - barHeight * 1.5; // 在角色頭上
        
        // 計算血量百分比
        const healthPercent = this.stats.hp / this.stats.maxhp;
        
        ctx.save();
        
        // 繪製血條背景（黑色邊框）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        
        // 繪製血條背景（深紅色）
        ctx.fillStyle = 'rgba(128, 0, 0, 0.8)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // 繪製當前血量（綠色）
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        ctx.restore();
    }
}

// 攻擊特效類
class AttackEffect {
    constructor(x, y, colorIndex = 0, onComplete = null) {
        this.gridX = x;
        this.gridY = y;
        this.colorIndex = colorIndex; // 0-8 對應不同顏色的橫排
        this.onComplete = onComplete;
        
        // 動畫相關
        this.frameIndex = 0; // 當前frame (0-8)
        this.lastFrameTime = 0;
        this.frameDelay = 80; // 每frame間隔80ms
        this.isPlaying = true;
        
        // 載入特效圖片
        this.effectImage = new Image();
        this.effectImage.src = 'effects/001.png';
        this.imageLoaded = false;
        
        this.effectImage.onload = () => {
            this.imageLoaded = true;
            console.log('攻擊特效圖片載入完成');
        };
        
        this.effectImage.onerror = () => {
            console.error('攻擊特效圖片載入失敗: effects/001.png');
        };
    }
    
    // 更新動畫
    update() {
        if (!this.isPlaying || !this.imageLoaded) return false;
        
        const currentTime = Date.now();
        if (currentTime - this.lastFrameTime >= this.frameDelay) {
            this.frameIndex++;
            this.lastFrameTime = currentTime;
            
            // 動畫播放完成（9個frame播完）
            if (this.frameIndex >= 9) {
                this.isPlaying = false;
                if (this.onComplete) {
                    this.onComplete();
                }
                return true; // 標示要被移除
            }
        }
        
        return false;
    }
    
    // 繪製特效
    draw(ctx, offsetX = 0, offsetY = 0) {
        if (!this.isPlaying || !this.imageLoaded) return;
        
        // 設置像素完美渲染（與角色保持一致）
        ctx.imageSmoothingEnabled = false;
        
        // 使用與角色相同的位置計算方式
        const CELL_SIZE = GAME_CONFIG.CELL_SIZE;
        
        // 計算格子位置（與角色的位置計算保持一致）
        const cellX = this.gridX * CELL_SIZE + offsetX;
        const cellY = this.gridY * CELL_SIZE + offsetY;
        
        // 計算特效大小（縮小到0.8倍）
        const effectSize = CELL_SIZE * 0.8;
        const effectOffset = (CELL_SIZE - effectSize) / 2; // 居中偏移
        
        // 計算sprite位置（9x9網格，每個64x64）
        const sourceX = this.frameIndex * 64;
        const sourceY = this.colorIndex * 64;
        
        // 繪製特效（縮小到0.8倍並居中）
        ctx.drawImage(
            this.effectImage,
            sourceX, sourceY, 64, 64, // 來源
            cellX + effectOffset, cellY + effectOffset, effectSize, effectSize // 目標
        );
    }
}

// 傷害數字類
class DamageNumber {
    constructor(damage, gridX, gridY, onComplete = null) {
        this.damage = damage;
        this.gridX = gridX;
        this.gridY = gridY;
        this.offsetX = 0;
        this.offsetY = 0;
        this.opacity = 1.0;
        this.scale = 1.0;
        this.lifetime = 0; // 生存時間（毫秒）
        this.maxLifetime = 2000; // 最大生存時間（2秒）
        this.startTime = Date.now();
        this.onComplete = onComplete; // 完成回調
        this.hasCompletedCallback = false; // 是否已經調用過回調
    }
    
    // 更新傷害數字的位置和透明度
    update() {
        this.lifetime = Date.now() - this.startTime;
        const progress = this.lifetime / this.maxLifetime;
        
        // 在動畫播到一半（50%）時調用回調
        if (progress >= 0.5 && this.onComplete && !this.hasCompletedCallback) {
            this.hasCompletedCallback = true;
            console.log('傷害數字動畫播到一半，調用完成回調');
            this.onComplete();
        }
        
        if (progress >= 1.0) {
            return false; // 標記為需要移除
        }
        
        // 向上漂浮效果
        this.offsetY = -progress * 60; // 向上移動60像素
        this.offsetX = Math.sin(progress * Math.PI * 2) * 10; // 輕微左右搖擺
        
        // 透明度漸變
        if (progress < 0.7) {
            this.opacity = 1.0;
        } else {
            this.opacity = 1.0 - (progress - 0.7) / 0.3; // 最後30%時間淡出
        }
        
        // 縮放效果
        if (progress < 0.2) {
            this.scale = 1.0 + (1.0 - progress / 0.2) * 0.5; // 開始時稍微放大
        } else {
            this.scale = 1.0;
        }
        
        return true; // 繼續存在
    }
    
    // 繪製傷害數字
    draw(ctx) {
        const cellSize = GAME_CONFIG.CELL_SIZE;
        const x = this.gridX * cellSize + cellSize * 0.8 + this.offsetX; // 右上角位置
        const y = this.gridY * cellSize + cellSize * 0.2 + this.offsetY;
        
        ctx.save();
        
        // 設置透明度和縮放
        ctx.globalAlpha = this.opacity;
        ctx.translate(x, y);
        ctx.scale(this.scale, this.scale);
        
        // 設置文字樣式
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 繪製文字陰影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(`-${this.damage}`, 2, 2);
        
        // 繪製主要文字
        ctx.fillStyle = '#ff4444'; // 紅色傷害數字
        ctx.fillText(`-${this.damage}`, 0, 0);
        
        // 繪製文字邊框
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeText(`-${this.damage}`, 0, 0);
        
        ctx.restore();
    }
}

// 遊戲管理器
class GameManager {
    constructor() {
        this.currentPage = 'start';
        this.pages = ['start', 'mainMenu', 'battle'];
        this.eventHandlers = {};
        this.battleCanvas = null;
        this.battleCtx = null;
        
        // 拖曳相關變數
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.battleOffsetX = 0;
        this.battleOffsetY = 0;
        this.battleContainer = null;
        
        // 縮放相關變數
        this.zoomLevel = 1.0;
        this.minZoom = 0.2;
        this.maxZoom = 3.0;
        this.zoomStep = 0.1;
        
        // 角色系統
        this.characters = [];
        this.characterSprites = {};
        
        // 特效系統
        this.attackEffects = []; // 攻擊特效陣列
        
        // 移動系統
        this.selectedCharacter = null;
        this.movementRange = [];
        
        // 攻擊系統
        this.attackRange = [];
        this.gameState = 'normal'; // 'normal', 'moving', 'attacking'
        
        // 速度制行動系統
        this.SPEED_BASE = 10000; // 速度基準值
        this.actionQueue = []; // 行動順序佇列
        this.currentActingCharacter = null; // 當前行動的角色
        this.turnIndicator = null;
        
        // 行動菜單系統
        this.actionMenu = null;
        this.originalPosition = null; // 記錄移動前的位置
        
        // 傷害顯示系統
        this.damageNumbers = []; // 存儲所有的傷害數字
        
        this.initializeEventHandlers();
    }

    // 初始化事件處理器
    initializeEventHandlers() {
        // 為每個頁面設置不同的事件處理器
        this.eventHandlers = {
            start: {
                keydown: (e) => this.handleStartPageKeydown(e),
                click: (e) => this.handleStartPageClick(e)
            },
            mainMenu: {
                keydown: (e) => this.handleMainMenuKeydown(e),
                click: (e) => this.handleMainMenuClick(e)
            },
            battle: {
                keydown: (e) => this.handleBattleKeydown(e),
                click: (e) => this.handleBattleClick(e),
                mousedown: (e) => this.handleBattleMouseDown(e),
                mousemove: (e) => this.handleBattleMouseMove(e),
                mouseup: (e) => this.handleBattleMouseUp(e),
                wheel: (e) => this.handleBattleWheel(e),
                contextmenu: (e) => e.preventDefault() // 禁用右鍵選單
            }
        };
    }

    // 切換頁面
    switchPage(newPage) {
        console.log(`切換頁面: ${this.currentPage} -> ${newPage}`);
        
        // 移除當前頁面的事件監聽器
        this.removeEventListeners();
        
        // 隱藏當前頁面
        const currentPageElement = document.getElementById(this.currentPage + 'Page');
        if (currentPageElement) {
            currentPageElement.classList.remove('active');
        }
        
        // 顯示新頁面
        const newPageElement = document.getElementById(newPage + 'Page');
        if (newPageElement) {
            newPageElement.classList.add('active');
            this.currentPage = newPage;
            
            // 添加新頁面的事件監聽器
            this.addEventListeners();
            
            // 執行頁面初始化
            this.initializePage(newPage);
        }
    }

    // 初始化特定頁面
    initializePage(pageName) {
        switch(pageName) {
            case 'start':
                console.log('初始化開始頁面');
                break;
            case 'mainMenu':
                console.log('初始化主選單頁面');
                break;
            case 'battle':
                console.log('初始化戰鬥頁面');
                this.initializeBattlePage();
                break;
        }
    }

    // 載入角色圖片
    loadCharacterSprite(filename, folder = 'chara') {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.characterSprites[`${folder}/${filename}`] = img;
                resolve(img);
            };
            img.onerror = (error) => {
                console.error(`無法載入角色圖片: ${folder}/${filename}`, error);
                reject(error);
            };
            img.src = `${folder}/${filename}`;
        });
    }

    // 初始化角色
    async initializeCharacters() {
        try {
            // 載入主角圖片
            const playerSpriteImage = await this.loadCharacterSprite('000.png', 'chara');
            
            // 設定主角屬性
            const playerStats = {
                hp: 120,
                maxhp: 120,
                mp: 60,
                maxmp: 60,
                str: 28,
                def: 12,
                mstr: 14,
                mdef: 10,
                spd: 100,
                mv: 3,
                range: 1
            };
            
            // 創建主角並放在 (6, 4) 位置
            const player = new Character(6, 4, playerSpriteImage, playerStats, false);
            player.isLoaded = true;
            
            // 載入第二個我方角色圖片
            const ally1SpriteImage = await this.loadCharacterSprite('001.png', 'chara');
            
            // 設定第二個我方角色屬性（與主角相同，但速度是90）
            const ally1Stats = {
                hp: 120,
                maxhp: 120,
                mp: 60,
                maxmp: 60,
                str: 28,
                def: 12,
                mstr: 14,
                mdef: 10,
                spd: 90,
                mv: 3,
                range: 1
            };
            
            // 創建第二個我方角色並放在 (5, 4) 位置
            const ally1 = new Character(5, 4, ally1SpriteImage, ally1Stats, false);
            ally1.isLoaded = true;
            
            // 載入敵人圖片
            const enemySpriteImage = await this.loadCharacterSprite('000.png', 'enemy');
            
            // 設定敵人屬性
            const enemyStats = {
                hp: 100,
                maxhp: 100,
                mp: 40,
                maxmp: 40,
                str: 16,
                def: 8,
                mstr: 10,
                mdef: 6,
                spd: 80,
                mv: 2,
                range: 1
            };
            
            // 創建敵人並放在 (8, 5) 位置
            const enemy = new Character(8, 5, enemySpriteImage, enemyStats, true);
            enemy.isLoaded = true;
            
            this.characters = [player, ally1, enemy];
            
            console.log('角色初始化完成');
            console.log('主角屬性:', player.getStatusInfo());
            console.log('我方角色2屬性:', ally1.getStatusInfo());
            console.log('敵人屬性:', enemy.getStatusInfo());
            
            // 初始化速度制行動系統
            this.initializeActionQueue();
            
            this.redrawBattleScene();
            
        } catch (error) {
            console.error('角色初始化失敗:', error);
        }
    }
    
    // 初始化行動佇列
    initializeActionQueue() {
        this.actionQueue = [];
        
        // 為所有角色計算初始等待時間並加入佇列
        this.characters.forEach(character => {
            if (character.isAlive()) {
                character.waitTime = this.SPEED_BASE / character.stats.spd;
                character.hasActed = false;
                this.actionQueue.push(character);
            }
        });
        
        console.log('初始化行動佇列:');
        this.actionQueue.forEach((char, index) => {
            console.log(`${index + 1}. ${char.isEnemy ? '敵人' : '主角'} - 等待時間: ${char.waitTime.toFixed(2)}`);
        });
        
        // 更新佇列顯示
        this.updateActionQueueDisplay();
        
        // 開始第一個角色的回合
        this.nextCharacterTurn();
    }
    
    // 排序行動佇列
    sortActionQueue() {
        this.actionQueue.sort((a, b) => a.waitTime - b.waitTime);
    }
    
    // 下一個角色的回合
    nextCharacterTurn() {
        if (this.actionQueue.length === 0) {
            console.log('沒有角色可以行動');
            return;
        }
        
        // 推進時間直到有角色可以行動
        this.advanceTime();
        
        // 找到等待時間為0或最小的角色
        this.actionQueue.sort((a, b) => a.waitTime - b.waitTime);
        this.currentActingCharacter = this.actionQueue[0];
        
        // 如果最小等待時間還大於0，表示需要繼續等待
        if (this.currentActingCharacter.waitTime > 0) {
            console.log('所有角色都還在等待中，繼續推進時間...');
            setTimeout(() => this.nextCharacterTurn(), 100);
            return;
        }
        
        this.currentActingCharacter.hasActed = false;
        
        console.log(`輪到 ${this.currentActingCharacter.isEnemy ? '敵人' : '主角'} 行動`);
        console.log(`當前等待時間: ${this.currentActingCharacter.waitTime.toFixed(2)}`);
        console.log(`當前行動佇列長度: ${this.actionQueue.length}`);
        
        // 更新佇列顯示
        this.updateActionQueueDisplay();
        
        // 將鏡頭移動到當前行動角色
        this.centerCameraOnCharacter(this.currentActingCharacter);
        
        // 如果是AI角色，自動執行AI
        if (this.currentActingCharacter.isEnemy) {
            console.log('準備執行敵人AI...');
            setTimeout(() => {
                console.log('開始執行敵人AI');
                this.executeEnemyAI(this.currentActingCharacter, 
                    this.characters.filter(char => !char.isEnemy && char.isAlive()));
            }, 1000);
        } else {
            // 玩家角色，自動選擇並顯示菜單
            console.log('玩家角色行動，自動顯示行動菜單...');
            setTimeout(() => {
                this.selectedCharacter = this.currentActingCharacter;
                this.showActionMenu(this.currentActingCharacter);
                this.redrawBattleScene();
            }, 500); // 等待鏡頭移動完成後顯示菜單
        }
    }
    
    // 將鏡頭移動到指定角色
    centerCameraOnCharacter(character) {
        if (!character || !this.battleCanvas) return;
        
        // 計算目標位置
        const characterPixelX = character.gridX * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2;
        const characterPixelY = character.gridY * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2;
        
        const canvasWidth = GAME_CONFIG.GRID_COLS * GAME_CONFIG.CELL_SIZE;
        const canvasHeight = GAME_CONFIG.GRID_ROWS * GAME_CONFIG.CELL_SIZE;
        
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;
        
        const offsetFromCanvasCenterX = characterPixelX - canvasCenterX;
        const offsetFromCanvasCenterY = characterPixelY - canvasCenterY;
        
        const targetOffsetX = -offsetFromCanvasCenterX * this.zoomLevel;
        const targetOffsetY = -offsetFromCanvasCenterY * this.zoomLevel;
        
        // 使用動畫移動鏡頭
        this.animateCameraTo(targetOffsetX, targetOffsetY);
        
        console.log(`鏡頭移動到角色位置: (${character.gridX}, ${character.gridY})`);
    }
    
    // 動畫移動鏡頭到指定位置
    animateCameraTo(targetX, targetY) {
        const startX = this.battleOffsetX;
        const startY = this.battleOffsetY;
        
        // 計算移動距離
        const deltaX = targetX - startX;
        const deltaY = targetY - startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 設定基礎移動速度（像素/毫秒）
        const baseSpeed = 2.0; // 每毫秒移動2像素
        
        // 根據距離計算動畫時間，最大800ms
        const calculatedDuration = distance / baseSpeed;
        const duration = Math.min(calculatedDuration, 800);
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用緩動函數讓移動更自然
            const easeProgress = this.easeInOutQuad(progress);
            
            this.battleOffsetX = startX + deltaX * easeProgress;
            this.battleOffsetY = startY + deltaY * easeProgress;
            
            this.updateBattlePosition();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // 緩動函數（二次方緩入緩出）
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    // 推進時間系統
    advanceTime() {
        // 找到最小的等待時間
        const minWaitTime = Math.min(...this.actionQueue.map(char => char.waitTime));
        
        console.log(`推進時間: ${minWaitTime.toFixed(2)}`);
        
        // 所有角色的等待時間都減去最小值
        this.actionQueue.forEach(char => {
            char.waitTime -= minWaitTime;
            console.log(`${char.isEnemy ? '敵人' : '主角'} 等待時間: ${char.waitTime.toFixed(2)}`);
        });
        
        // 更新佇列顯示
        this.updateActionQueueDisplay();
    }
    
    // 角色完成行動
    completeCharacterAction(character) {
        console.log('=== completeCharacterAction 開始 ===');
        console.log(`角色: ${character.isEnemy ? '敵人' : '主角'}`);
        
        // 重新計算等待時間（角色行動後需要等待下一次行動）
        character.waitTime = this.SPEED_BASE / character.stats.spd;
        character.hasActed = true;
        
        console.log(`重新計算等待時間: ${character.waitTime.toFixed(2)}`);
        console.log(`${character.isEnemy ? '敵人' : '主角'} 完成行動，等待時間重置`);
        
        // 清理選擇狀態
        this.deselectCharacter();
        
        // 更新佇列顯示
        this.updateActionQueueDisplay();
        
        // 繼續下一個角色的回合
        console.log('準備呼叫 nextCharacterTurn...');
        this.nextCharacterTurn();
    }
    
    // 更新行動佇列顯示
    updateActionQueueDisplay() {
        if (!this.queueList) return;
        
        // 清空現有顯示
        this.queueList.innerHTML = '';
        
        // 建立一個暫時的佇列副本並按等待時間排序
        const sortedQueue = [...this.actionQueue].sort((a, b) => a.waitTime - b.waitTime);
        
        sortedQueue.forEach((character, index) => {
            const queueItem = document.createElement('div');
            queueItem.className = 'queue-character';
            
            // 如果是當前行動角色，添加高亮樣式
            if (character === this.currentActingCharacter) {
                queueItem.classList.add('current');
            }
            
            // 創建角色圖示容器
            const iconContainer = document.createElement('div');
            iconContainer.className = 'queue-character-icon';
            
            // 創建角色圖示的canvas
            if (character.spriteImage) {
                const iconCanvas = document.createElement('canvas');
                iconCanvas.width = 32;
                iconCanvas.height = 32; // 改為正方形
                iconCanvas.className = 'queue-character-sprite';
                
                const iconCtx = iconCanvas.getContext('2d');
                iconCtx.imageSmoothingEnabled = false;
                
                // 使用角色當前的動畫幀和朝向
                const spriteX = character.animationFrame * GAME_CONFIG.CHAR_SPRITE_W;
                const spriteY = character.facing * GAME_CONFIG.CHAR_SPRITE_H;
                
                // 從角色圖片中擷取指定區域的上半部分
                iconCtx.drawImage(
                    character.spriteImage,
                    spriteX,                       // 源圖 X (根據動畫幀)
                    spriteY,                       // 源圖 Y (根據朝向)
                    GAME_CONFIG.CHAR_SPRITE_W,     // 源圖寬度
                    GAME_CONFIG.CHAR_SPRITE_H / 2, // 源圖高度的一半（上半部）
                    0,                             // 目標 X
                    0,                             // 目標 Y
                    32,                            // 目標寬度
                    32                             // 目標高度（正方形）
                );
                
                iconContainer.appendChild(iconCanvas);
            }
            
            // 創建等待時間顯示
            const waitTimeDisplay = document.createElement('div');
            waitTimeDisplay.className = 'queue-wait-time';
            waitTimeDisplay.textContent = character.waitTime.toFixed(0);
            
            queueItem.appendChild(iconContainer);
            queueItem.appendChild(waitTimeDisplay);
            this.queueList.appendChild(queueItem);
        });
        
        // 更新佇列後重繪戰鬥場景，以更新當前行動角色指示器
        this.redrawBattleScene();
    }

    // 初始化戰鬥頁面
    initializeBattlePage() {
        this.battleCanvas = document.getElementById('battleCanvas');
        this.battleContainer = document.getElementById('battleContainer');
        this.actionMenu = document.getElementById('actionMenu');
        this.turnIndicator = document.getElementById('turnIndicator');
        this.queueList = document.getElementById('queueList');
        this.battleCtx = this.battleCanvas.getContext('2d');
        
        console.log('行動菜單元素:', this.actionMenu);
        
        // 重置拖曳狀態
        this.isDragging = false;
        this.battleOffsetX = 0;
        this.battleOffsetY = 0;
        
        // 重置縮放狀態
        this.zoomLevel = 1.0;
        
        // 重置回合
        this.currentTurn = 'player';
        this.updateTurnIndicator();
        
        // 設置canvas大小
        const canvasWidth = GAME_CONFIG.GRID_COLS * GAME_CONFIG.CELL_SIZE;
        const canvasHeight = GAME_CONFIG.GRID_ROWS * GAME_CONFIG.CELL_SIZE;
        
        this.battleCanvas.width = canvasWidth;
        this.battleCanvas.height = canvasHeight;
        
        // 重置畫布位置
        this.updateBattlePosition();
        
        // 繪製戰鬥網格
        this.drawBattleGrid();
        
        // 初始化角色
        this.initializeCharacters();
        
        // 啟動動畫循環
        this.startAnimationLoop();
    }
    
    // 啟動動畫循環
    startAnimationLoop() {
        const animate = () => {
            // 重繪戰鬥場景（包含角色動畫更新）
            this.redrawBattleScene();
            
            // 繼續動畫循環
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }

    // 繪製戰鬥網格
    drawBattleGrid() {
        if (!this.battleCtx) return;
        
        const ctx = this.battleCtx;
        const cellSize = GAME_CONFIG.CELL_SIZE;
        const cols = GAME_CONFIG.GRID_COLS;
        const rows = GAME_CONFIG.GRID_ROWS;
        
        // 清空畫布
        ctx.clearRect(0, 0, this.battleCanvas.width, this.battleCanvas.height);
        
        // 設置線條樣式
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 1;
        
        // 繪製垂直線
        for (let i = 0; i <= cols; i++) {
            const x = i * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rows * cellSize);
            ctx.stroke();
        }
        
        // 繪製水平線
        for (let i = 0; i <= rows; i++) {
            const y = i * cellSize;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(cols * cellSize, y);
            ctx.stroke();
        }
        
        console.log(`繪製戰鬥網格: ${cols} x ${rows}`);
    }

    // 計算角色移動範圍
    calculateMovementRange(character) {
        const range = [];
        const mv = character.stats.mv;
        const startX = character.gridX;
        const startY = character.gridY;
        
        // 將角色當前位置也加入範圍（用於視覺顯示）
        range.push({x: startX, y: startY, distance: 0});
        
        // 使用廣度優先搜索計算移動範圍
        const queue = [{x: startX, y: startY, distance: 0}];
        const visited = new Set();
        visited.add(`${startX},${startY}`);
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            // 如果距離小於等於移動力且大於0，加入可移動範圍
            if (current.distance > 0 && current.distance <= mv) {
                range.push({x: current.x, y: current.y, distance: current.distance});
            }
            
            // 只有在當前距離小於移動力時才繼續擴展
            if (current.distance < mv) {
                // 檢查四個方向
                const directions = [
                    {dx: 0, dy: -1}, // 上
                    {dx: 0, dy: 1},  // 下
                    {dx: -1, dy: 0}, // 左
                    {dx: 1, dy: 0}   // 右
                ];
                
                directions.forEach(dir => {
                    const newX = current.x + dir.dx;
                    const newY = current.y + dir.dy;
                    const key = `${newX},${newY}`;
                    
                    // 檢查邊界和是否已訪問
                    if (newX >= 0 && newX < GAME_CONFIG.GRID_COLS && 
                        newY >= 0 && newY < GAME_CONFIG.GRID_ROWS && 
                        !visited.has(key)) {
                        
                        // 檢查是否有其他角色阻擋
                        const isBlocked = this.characters.some(char => 
                            char !== character && char.gridX === newX && char.gridY === newY
                        );
                        
                        if (!isBlocked) {
                            visited.add(key);
                            queue.push({x: newX, y: newY, distance: current.distance + 1});
                        }
                    }
                });
            }
        }
        
        return range;
    }

    // 計算攻擊範圍
    calculateAttackRange(character) {
        const range = [];
        const attackRange = character.stats.range;
        const startX = character.gridX;
        const startY = character.gridY;
        
        // 使用廣度優先搜索計算攻擊範圍
        const queue = [{x: startX, y: startY, distance: 0}];
        const visited = new Set();
        visited.add(`${startX},${startY}`);
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            // 如果距離小於等於攻擊範圍且大於0，加入攻擊範圍
            if (current.distance > 0 && current.distance <= attackRange) {
                range.push({x: current.x, y: current.y, distance: current.distance});
            }
            
            // 只有在當前距離小於攻擊範圍時才繼續擴展
            if (current.distance < attackRange) {
                // 檢查四個方向
                const directions = [
                    {dx: 0, dy: -1}, // 上
                    {dx: 0, dy: 1},  // 下
                    {dx: -1, dy: 0}, // 左
                    {dx: 1, dy: 0}   // 右
                ];
                
                directions.forEach(dir => {
                    const newX = current.x + dir.dx;
                    const newY = current.y + dir.dy;
                    const key = `${newX},${newY}`;
                    
                    // 檢查邊界和是否已訪問
                    if (newX >= 0 && newX < GAME_CONFIG.GRID_COLS && 
                        newY >= 0 && newY < GAME_CONFIG.GRID_ROWS && 
                        !visited.has(key)) {
                        
                        visited.add(key);
                        queue.push({x: newX, y: newY, distance: current.distance + 1});
                    }
                });
            }
        }
        
        return range;
    }

    // 繪製移動範圍
    drawMovementRange() {
        if (!this.battleCtx || this.movementRange.length === 0) return;
        
        const ctx = this.battleCtx;
        ctx.save();
        
        // 設置半透明黃色
        ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
        
        this.movementRange.forEach(cell => {
            const x = cell.x * GAME_CONFIG.CELL_SIZE;
            const y = cell.y * GAME_CONFIG.CELL_SIZE;
            ctx.fillRect(x, y, GAME_CONFIG.CELL_SIZE, GAME_CONFIG.CELL_SIZE);
        });
        
        ctx.restore();
    }

    // 繪製攻擊範圍
    drawAttackRange() {
        if (!this.battleCtx || this.attackRange.length === 0) return;
        
        const ctx = this.battleCtx;
        ctx.save();
        
        // 設置半透明紅色
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        
        this.attackRange.forEach(cell => {
            const x = cell.x * GAME_CONFIG.CELL_SIZE;
            const y = cell.y * GAME_CONFIG.CELL_SIZE;
            ctx.fillRect(x, y, GAME_CONFIG.CELL_SIZE, GAME_CONFIG.CELL_SIZE);
        });
        
        ctx.restore();
    }

    // 選擇角色
    selectCharacter(character) {
        // 只允許選擇當前行動的角色
        if (character !== this.currentActingCharacter) {
            console.log(character.isEnemy ? '無法選擇敵人' : '不是該角色的行動回合');
            return;
        }
        
        // 確保是玩家角色
        if (character.isEnemy) {
            console.log('無法選擇敵人');
            return;
        }
        
        this.selectedCharacter = character;
        this.showActionMenu(character);
        console.log(`選擇角色位置: (${character.gridX}, ${character.gridY})`);
        this.redrawBattleScene();
    }

    // 進入攻擊模式（內部使用）
    enterAttackMode(character) {
        this.selectedCharacter = character;
        this.attackRange = this.calculateAttackRange(character);
        this.movementRange = []; // 清除移動範圍
        this.gameState = 'attacking';
        console.log(`進入攻擊模式，攻擊範圍: ${this.attackRange.length} 格`);
        this.redrawBattleScene();
    }

    // 顯示角色行動菜單
    showActionMenu(character) {
        if (!this.actionMenu) {
            return;
        }
        
        // 計算角色在螢幕上的位置
        const canvasRect = this.battleCanvas.getBoundingClientRect();
        
        // 模擬點擊處理的逆向計算
        const simulatedClickX = (character.gridX * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2) * this.zoomLevel;
        const simulatedClickY = (character.gridY * GAME_CONFIG.CELL_SIZE + GAME_CONFIG.CELL_SIZE / 2) * this.zoomLevel;
        
        // 轉換為螢幕座標
        const screenX = canvasRect.left + simulatedClickX;
        const screenY = canvasRect.top + simulatedClickY;
        
        // 計算菜單位置
        const menuWidth = 250;
        const menuHeight = 50;
        const characterSize = GAME_CONFIG.CELL_SIZE * this.zoomLevel;
        
        let menuX = screenX - menuWidth / 2;
        let menuY = screenY + characterSize / 2 + 10;
        
        // 邊界檢查
        const margin = 10;
        if (menuY + menuHeight > window.innerHeight - margin) {
            menuY = screenY - characterSize / 2 - menuHeight - 10;
        }
        
        if (menuX < margin) {
            menuX = margin;
        } else if (menuX + menuWidth > window.innerWidth - margin) {
            menuX = window.innerWidth - menuWidth - margin;
        }
        
        this.actionMenu.style.position = 'fixed';
        this.actionMenu.style.left = menuX + 'px';
        this.actionMenu.style.top = menuY + 'px';
        this.actionMenu.style.zIndex = '1001';
        
        this.createActionButtons(character);
        this.actionMenu.style.display = 'block';
    }
    
    // 創建行動按鈕
    createActionButtons(character) {
        this.actionMenu.innerHTML = '';
        
        if (this.gameState === 'normal') {
            // 正常狀態：移動, 攻擊, 技能1, 技能2, 待機
            this.addActionButton('移動', () => this.startMovement(character));
            this.addActionButton('攻擊', () => this.startAttack(character));
            this.addActionButton('技能1', () => this.useSkill(character, 1));
            this.addActionButton('技能2', () => this.useSkill(character, 2));
            this.addActionButton('待機', () => this.standby(), 'standby');
        } else if (this.gameState === 'moved') {
            // 移動後狀態：攻擊, 技能1, 技能2, 待機, 取消
            this.addActionButton('攻擊', () => this.startAttack(character));
            this.addActionButton('技能1', () => this.useSkill(character, 1));
            this.addActionButton('技能2', () => this.useSkill(character, 2));
            this.addActionButton('待機', () => this.standby(), 'standby');
            this.addActionButton('取消', () => this.cancelMovement(), 'cancel');
        }
    }
    
    // 添加行動按鈕
    addActionButton(text, onClick, className = '') {
        const button = document.createElement('button');
        button.className = 'action-button' + (className ? ' ' + className : '');
        button.textContent = text;
        button.onclick = onClick;
        this.actionMenu.appendChild(button);
    }
    
    // 隱藏行動菜單
    hideActionMenu() {
        if (this.actionMenu) {
            this.actionMenu.style.display = 'none';
        }
    }
    
    // 開始移動
    startMovement(character) {
        this.selectedCharacter = character;
        this.movementRange = this.calculateMovementRange(character);
        this.gameState = 'moving';
        this.hideActionMenu();
        console.log(`開始移動模式，移動範圍: ${this.movementRange.length} 格`);
        this.redrawBattleScene();
    }
    
    // 開始攻擊
    startAttack(character) {
        this.selectedCharacter = character;
        this.attackRange = this.calculateAttackRange(character);
        this.gameState = 'attacking';
        this.hideActionMenu();
        console.log(`開始攻擊模式，攻擊範圍: ${this.attackRange.length} 格`);
        this.redrawBattleScene();
    }
    
    // 使用技能
    useSkill(character, skillNumber) {
        console.log(`${character.isEnemy ? '敵人' : '玩家'}使用技能${skillNumber}`);
        // TODO: 實現技能系統
        this.hideActionMenu();
        this.completeCharacterAction(character);
    }
    
    // 待機
    standby() {
        console.log('選擇待機，完成行動');
        this.hideActionMenu();
        this.completeCharacterAction(this.currentActingCharacter);
    }
    
    // 取消移動
    cancelMovement() {
        if (this.originalPosition && this.selectedCharacter) {
            console.log('取消移動，瞬間回到原位置');
            
            // 停止當前移動動畫
            this.selectedCharacter.isMoving = false;
            
            // 瞬間回到原位置
            this.selectedCharacter.gridX = this.originalPosition.x;
            this.selectedCharacter.gridY = this.originalPosition.y;
            this.selectedCharacter.renderX = this.originalPosition.x;
            this.selectedCharacter.renderY = this.originalPosition.y;
            this.selectedCharacter.facing = GAME_CONFIG.DIRECTION.DOWN; // 恢復朝下
            
            this.originalPosition = null;
            this.gameState = 'normal';
            this.hideActionMenu();
            this.showActionMenu(this.selectedCharacter);
            this.redrawBattleScene();
        }
    }

    // 執行攻擊
    performAttack(attacker, target) {
        const damage = Math.max(1, attacker.stats.str - target.stats.def);
        const isDead = target.takeDamage(damage);
        
        console.log(`${attacker.isEnemy ? '敵人' : '我方'}攻擊${target.isEnemy ? '敵人' : '我方'}!`);
        console.log(`造成 ${damage} 點傷害`);
        console.log(`目標剩餘HP: ${target.stats.hp}/${target.stats.maxhp}`);
        
        // 先播放攻擊特效，然後顯示傷害數字
        this.addAttackEffect(target.gridX, target.gridY, 0, () => {
            // 攻擊特效完成後顯示傷害數字
            this.addDamageNumber(damage, target.gridX, target.gridY, () => {
                // 傷害動畫完成後的回調
                console.log('攻擊動畫完成，繼續下一個角色行動');
                this.completeCharacterAction(attacker);
            });
        });
        
        if (isDead) {
            console.log(`${target.isEnemy ? '敵人' : '我方'}被擊敗!`);
        }
        
        console.log('等待攻擊動畫完成...');
        // 注意：不在這裡直接調用 completeCharacterAction，改為在動畫完成後調用
    }
    
    // 結束回合
    endTurn() {
        console.log('=== 結束回合被調用 ===');
        console.log(`當前回合: ${this.currentTurn}`);
        
        this.deselectCharacter();
        this.currentTurn = this.currentTurn === 'player' ? 'enemy' : 'player';
        this.updateTurnIndicator();
        
        console.log(`現在是${this.currentTurn === 'player' ? '玩家' : '敵人'}回合`);
        
        // 如果是敵人回合，執行AI
        if (this.currentTurn === 'enemy') {
            console.log('準備執行敵人回合...');
            setTimeout(() => {
                this.executeEnemyTurn();
            }, 1000); // 延遲1秒讓玩家看清楚
        }
    }
    
    // 更新回合指示器
    updateTurnIndicator() {
        // 暫時用控制台輸出，之後可以加UI
        console.log(`=== ${this.currentTurn === 'player' ? '玩家回合' : '敵人回合'} ===`);
    }
    
    // 執行敵人回合
    executeEnemyTurn() {
        console.log('=== 執行敵人回合開始 ===');
        const enemies = this.characters.filter(char => char.isEnemy && char.isAlive());
        const players = this.characters.filter(char => !char.isEnemy && char.isAlive());
        
        console.log(`敵人數量: ${enemies.length}, 玩家數量: ${players.length}`);
        
        if (enemies.length === 0 || players.length === 0) {
            console.log('遊戲結束！');
            return;
        }
        
        // 目前只處理第一個敵人
        const enemy = enemies[0];
        console.log(`處理敵人位置: (${enemy.gridX}, ${enemy.gridY})`);
        this.executeEnemyAI(enemy, players);
    }
    
    // 敵人AI邏輯
    executeEnemyAI(enemy, targets) {
        console.log('=== 敵人AI開始行動 ===');
        console.log(`敵人當前位置: (${enemy.gridX}, ${enemy.gridY})`);
        console.log(`目標玩家數量: ${targets.length}`);
        
        // 確保鏡頭在敵人身上
        this.centerCameraOnCharacter(enemy);
        
        // 計算移動範圍和攻擊範圍
        const moveRange = this.calculateMovementRange(enemy);
        const attackRange = this.calculateAttackRange(enemy);
        
        console.log(`移動範圍: ${moveRange.length} 格, 攻擊範圍: ${attackRange.length} 格`);
        
        // 檢查是否有目標在移動+攻擊範圍內
        let bestAction = null;
        let minDistance = Infinity;
        
        // 檢查每個可移動位置
        for (const movePos of moveRange) {
            // 暫時移動敵人到這個位置來計算攻擊範圍
            const originalX = enemy.gridX;
            const originalY = enemy.gridY;
            enemy.gridX = movePos.x;
            enemy.gridY = movePos.y;
            
            const tempAttackRange = this.calculateAttackRange(enemy);
            
            // 檢查是否有目標在攻擊範圍內
            for (const target of targets) {
                const canAttack = tempAttackRange.some(pos => 
                    pos.x === target.gridX && pos.y === target.gridY
                );
                
                if (canAttack) {
                    const distance = Math.abs(movePos.x - originalX) + Math.abs(movePos.y - originalY);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestAction = {
                            type: 'attack',
                            moveX: movePos.x,
                            moveY: movePos.y,
                            target: target
                        };
                    }
                }
            }
            
            // 恢復原位置
            enemy.gridX = originalX;
            enemy.gridY = originalY;
        }
        
        // 如果沒有可攻擊的目標，找最近的目標移動過去
        if (!bestAction) {
            let closestTarget = null;
            let closestDistance = Infinity;
            
            for (const target of targets) {
                const distance = Math.abs(enemy.gridX - target.gridX) + Math.abs(enemy.gridY - target.gridY);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTarget = target;
                }
            }
            
            if (closestTarget) {
                // 找到朝向目標的最佳移動位置
                let bestMovePos = {x: enemy.gridX, y: enemy.gridY};
                let bestMoveDistance = closestDistance;
                
                for (const movePos of moveRange) {
                    const distance = Math.abs(movePos.x - closestTarget.gridX) + Math.abs(movePos.y - closestTarget.gridY);
                    if (distance < bestMoveDistance) {
                        bestMoveDistance = distance;
                        bestMovePos = movePos;
                    }
                }
                
                bestAction = {
                    type: 'move',
                    moveX: bestMovePos.x,
                    moveY: bestMovePos.y
                };
            }
        }
        
        // 執行行動
        console.log('最終行動決策:', bestAction);
        this.executeEnemyAction(enemy, bestAction);
    }
    
    // 執行敵人行動
    executeEnemyAction(enemy, action) {
        console.log('=== executeEnemyAction 開始 ===');
        console.log('action:', action);
        
        if (!action) {
            console.log('敵人無法行動');
            this.completeCharacterAction(enemy);
            return;
        }
        
        // 移動
        if (action.moveX !== enemy.gridX || action.moveY !== enemy.gridY) {
            console.log(`敵人移動到 (${action.moveX}, ${action.moveY})`);
            
            // 使用移動動畫
            enemy.startMovingTo(action.moveX, action.moveY, () => {
                // 移動完成後執行攻擊或結束回合
                if (action.type === 'attack') {
                    setTimeout(() => {
                        console.log('敵人發動攻擊!');
                        this.performAttack(enemy, action.target);
                    }, 200);
                } else {
                    // 只移動的話直接結束回合
                    console.log('敵人只移動，準備結束回合...');
                    setTimeout(() => {
                        console.log('呼叫 completeCharacterAction');
                        this.completeCharacterAction(enemy);
                    }, 300);
                }
            });
        } else {
            // 沒有移動，直接執行攻擊
            if (action.type === 'attack') {
                setTimeout(() => {
                    console.log('敵人發動攻擊!');
                    this.performAttack(enemy, action.target);
                }, 500);
            } else {
                // 直接結束回合
                console.log('敵人無移動，準備結束回合...');
                setTimeout(() => {
                    console.log('呼叫 completeCharacterAction');
                    this.completeCharacterAction(enemy);
                }, 500);
            }
        }
    }

    // 取消選擇角色
    deselectCharacter() {
        this.selectedCharacter = null;
        this.movementRange = [];
        this.attackRange = [];
        this.gameState = 'normal';
        this.originalPosition = null;
        this.hideActionMenu();
        this.redrawBattleScene();
    }

    // 重繪整個戰鬥場景
    redrawBattleScene() {
        if (!this.battleCtx) return;
        
        // 清空畫布
        this.battleCtx.clearRect(0, 0, this.battleCanvas.width, this.battleCanvas.height);
        
        // 重繪網格
        this.drawBattleGrid();
        
        // 繪製移動範圍
        this.drawMovementRange();
        
        // 繪製攻擊範圍
        this.drawAttackRange();
        
        // 繪製當前行動角色的指示器
        this.drawCurrentActingCharacterIndicator();
        
        // 繪製所有角色
        this.characters.forEach(character => {
            character.draw(this.battleCtx);
        });
        
        // 繪製攻擊特效（在角色下方）
        this.drawAttackEffects();
        
        // 繪製傷害數字（在角色上方）
        this.drawDamageNumbers();
    }
    
    // 繪製當前行動角色的指示器
    drawCurrentActingCharacterIndicator() {
        if (!this.battleCtx || !this.currentActingCharacter) return;
        
        const ctx = this.battleCtx;
        const character = this.currentActingCharacter;
        const cellSize = GAME_CONFIG.CELL_SIZE;
        
        ctx.save();
        
        // 計算格子位置
        const x = character.gridX * cellSize;
        const y = character.gridY * cellSize;
        
        // 繪製主要的淡藍色邊框
        ctx.strokeStyle = 'rgba(100, 149, 237, 0.9)'; // 較深的藍色，90%透明度
        ctx.lineWidth = 6; // 較粗的線條
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.rect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        ctx.stroke();
        
        // 添加發光效果 - 外層光暈
        ctx.strokeStyle = 'rgba(135, 206, 235, 0.5)'; // 淡藍色光暈
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.rect(x, y, cellSize, cellSize);
        ctx.stroke();
        
        // 添加內層細邊框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; // 白色內邊框
        ctx.lineWidth = 2;
        const margin = 6;
        ctx.beginPath();
        ctx.rect(x + margin, y + margin, cellSize - margin * 2, cellSize - margin * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // 繪製攻擊特效
    drawAttackEffects() {
        if (!this.battleCtx) return;
        
        // 與角色繪製保持一致，不傳遞相機偏移
        this.attackEffects.forEach(effect => {
            effect.draw(this.battleCtx, 0, 0);
        });
    }
    
    // 添加傷害數字
    addDamageNumber(damage, gridX, gridY, onComplete = null) {
        const damageNumber = new DamageNumber(damage, gridX, gridY, onComplete);
        this.damageNumbers.push(damageNumber);
        
        // 開始動畫循環（如果還沒開始）
        if (this.damageNumbers.length === 1) {
            this.startDamageAnimation();
        }
    }
    
    // 添加攻擊特效
    addAttackEffect(gridX, gridY, colorIndex = 0, onComplete = null) {
        const attackEffect = new AttackEffect(gridX, gridY, colorIndex, onComplete);
        this.attackEffects.push(attackEffect);
        
        // 開始特效動畫循環（如果還沒開始）
        if (this.attackEffects.length === 1) {
            this.startAttackEffectAnimation();
        }
    }
    
    // 開始攻擊特效動畫
    startAttackEffectAnimation() {
        const animate = () => {
            // 更新所有攻擊特效
            this.attackEffects = this.attackEffects.filter(effect => !effect.update());
            
            // 重繪場景
            this.redrawBattleScene();
            
            // 如果還有特效在播放，繼續動畫
            if (this.attackEffects.length > 0) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // 開始傷害數字動畫
    startDamageAnimation() {
        const animate = () => {
            // 更新所有傷害數字
            this.damageNumbers = this.damageNumbers.filter(damageNumber => damageNumber.update());
            
            // 重繪場景
            this.redrawBattleScene();
            
            // 如果還有傷害數字，繼續動畫
            if (this.damageNumbers.length > 0) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // 繪製所有傷害數字
    drawDamageNumbers() {
        if (!this.battleCtx || this.damageNumbers.length === 0) return;
        
        this.damageNumbers.forEach(damageNumber => {
            damageNumber.draw(this.battleCtx);
        });
    }

    // 更新戰鬥畫面位置和縮放
    updateBattlePosition() {
        if (this.battleCanvas) {
            // 結合CSS預設的置中效果和我們的額外偏移
            // CSS已經設定了 translate(-50%, -50%)，我們在此基礎上添加額外的像素偏移
            const translateX = this.battleOffsetX;
            const translateY = this.battleOffsetY;
            const scale = this.zoomLevel;
            
            // 組合變換：先置中（CSS預設），再應用我們的偏移和縮放
            this.battleCanvas.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`;
            
            console.log(`更新畫面位置: translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`);
        }
    }

    // 添加事件監聽器
    addEventListeners() {
        const handlers = this.eventHandlers[this.currentPage];
        if (handlers) {
            Object.keys(handlers).forEach(eventType => {
                document.addEventListener(eventType, handlers[eventType]);
            });
        }
    }

    // 移除事件監聽器
    removeEventListeners() {
        const handlers = this.eventHandlers[this.currentPage];
        if (handlers) {
            Object.keys(handlers).forEach(eventType => {
                document.removeEventListener(eventType, handlers[eventType]);
            });
        }
    }

    // 開始頁面事件處理器
    handleStartPageKeydown(e) {
        if (e.code === 'Enter' || e.code === 'Space') {
            this.switchPage('mainMenu');
        }
    }

    handleStartPageClick(e) {
        // 點擊處理已在HTML中定義
    }

    // 主選單頁面事件處理器
    handleMainMenuKeydown(e) {
        if (e.code === 'Escape') {
            this.switchPage('start');
        } else if (e.code === 'Enter') {
            this.switchPage('battle');
        }
    }

    handleMainMenuClick(e) {
        // 點擊處理已在HTML中定義
    }

    // 戰鬥頁面事件處理器
    handleBattleKeydown(e) {
        if (e.code === 'Escape') {
            this.switchPage('mainMenu');
        }
        console.log(`戰鬥頁面按鍵: ${e.code}`);
    }

    handleBattleMouseDown(e) {
        if (this.battleContainer && (e.target === this.battleContainer || e.target === this.battleCanvas)) {
            this.isDragging = true;
            this.dragStartX = e.clientX - this.battleOffsetX;
            this.dragStartY = e.clientY - this.battleOffsetY;
            this.battleContainer.classList.add('dragging');
            e.preventDefault();
        }
    }

    handleBattleMouseMove(e) {
        if (this.isDragging) {
            this.battleOffsetX = e.clientX - this.dragStartX;
            this.battleOffsetY = e.clientY - this.dragStartY;
            this.updateBattlePosition();
            e.preventDefault();
        }
    }

    handleBattleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            if (this.battleContainer) {
                this.battleContainer.classList.remove('dragging');
            }
        }
    }

    handleBattleWheel(e) {
        if (this.battleContainer && (e.target === this.battleContainer || e.target === this.battleCanvas)) {
            e.preventDefault();
            
            // 計算縮放變化
            const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
            const newZoom = this.zoomLevel + delta;
            
            // 限制縮放範圍
            this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
            
            // 獲取滑鼠相對於畫布的位置
            const rect = this.battleCanvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - rect.width / 2;
            const mouseY = e.clientY - rect.top - rect.height / 2;
            
            // 根據縮放調整偏移，讓縮放以滑鼠位置為中心
            const zoomFactor = delta / this.zoomStep;
            this.battleOffsetX -= mouseX * zoomFactor * 0.1;
            this.battleOffsetY -= mouseY * zoomFactor * 0.1;
            
            this.updateBattlePosition();
            
            console.log(`縮放等級: ${this.zoomLevel.toFixed(2)}x`);
        }
    }

    handleBattleClick(e) {
        // 只有在沒有拖曳的情況下才處理點擊
        if (!this.isDragging && this.battleCanvas && e.target === this.battleCanvas) {
            const rect = this.battleCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.zoomLevel;
            const y = (e.clientY - rect.top) / this.zoomLevel;
            
            const gridX = Math.floor(x / GAME_CONFIG.CELL_SIZE);
            const gridY = Math.floor(y / GAME_CONFIG.CELL_SIZE);
            
            // 檢查座標是否在有效範圍內
            if (gridX >= 0 && gridX < GAME_CONFIG.GRID_COLS && 
                gridY >= 0 && gridY < GAME_CONFIG.GRID_ROWS) {
                
                console.log(`點擊網格位置: (${gridX}, ${gridY})`);
                
                // 檢查是否點擊到角色
                const clickedCharacter = this.characters.find(char => 
                    char.gridX === gridX && char.gridY === gridY
                );
                
                if (clickedCharacter) {
                    console.log('點擊到角色!');
                    console.log('角色屬性:', clickedCharacter.getStatusInfo());
                    
                    if (this.gameState === 'moving') {
                        // 移動模式下，如果點擊的是同一角色，取消移動
                        if (clickedCharacter === this.selectedCharacter) {
                            this.deselectCharacter();
                        } else {
                            this.selectCharacter(clickedCharacter);
                        }
                    } else if (this.gameState === 'attacking') {
                        // 攻擊模式下，檢查是否點擊敵人並在攻擊範圍內
                        if (clickedCharacter.isEnemy) {
                            const inAttackRange = this.attackRange.some(cell => 
                                cell.x === gridX && cell.y === gridY
                            );
                            
                            if (inAttackRange) {
                                this.performAttack(this.selectedCharacter, clickedCharacter);
                            } else {
                                console.log('目標不在攻擊範圍內');
                            }
                        } else {
                            console.log('無法攻擊我方角色');
                        }
                    } else {
                        // 普通模式下，只有當點擊的不是已選中的角色時才重新選擇
                        if (clickedCharacter !== this.selectedCharacter) {
                            this.selectCharacter(clickedCharacter);
                        }
                    }
                } else {
                    // 點擊空格
                    if (this.selectedCharacter && this.gameState === 'moving') {
                        // 檢查是否點擊在移動範圍內
                        const inRange = this.movementRange.some(cell => 
                            cell.x === gridX && cell.y === gridY
                        );
                        
                        if (inRange) {
                            console.log(`移動角色到 (${gridX}, ${gridY})`);
                            // 記錄移動前位置
                            this.originalPosition = {
                                x: this.selectedCharacter.gridX,
                                y: this.selectedCharacter.gridY
                            };
                            
                            // 開始移動動畫
                            this.selectedCharacter.startMovingTo(gridX, gridY, () => {
                                // 移動完成後的回調
                                this.gameState = 'moved';
                                this.movementRange = [];
                                this.showActionMenu(this.selectedCharacter);
                                this.redrawBattleScene();
                            });
                        } else {
                            // 點擊範圍外，取消選擇
                            this.deselectCharacter();
                        }
                    } else {
                        // 其他情況取消選擇
                        this.deselectCharacter();
                    }
                }
            }
        }
    }
}

// 創建全域遊戲管理器實例
const gameManager = new GameManager();

// 頁面載入完成時初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('戰棋遊戲初始化完成');
    gameManager.initializePage('start');
    gameManager.addEventListeners();
});
