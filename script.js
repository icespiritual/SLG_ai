// 戰棋遊戲主程式

// 遊戲配置
const GAME_CONFIG = {
    // 戰鬥網格配置
    GRID_COLS: 12,  // 網格列數
    GRID_ROWS: 8,   // 網格行數
    CELL_SIZE: 200,  // 每個格子的大小(像素) - 放大4倍 (50 * 4 = 200)
    
    // 角色配置
    CHAR_SPRITE_X: 20,  // 角色圖片中的 X 座標
    CHAR_SPRITE_Y: 0,   // 角色圖片中的 Y 座標
    CHAR_SPRITE_W: 20,  // 角色圖片寬度 (39-20+1)
    CHAR_SPRITE_H: 32,  // 角色圖片高度 (31-0+1)
};

// 角色類別
class Character {
    constructor(gridX, gridY, spriteImage, stats = {}, isEnemy = false) {
        this.gridX = gridX;      // 網格座標 X
        this.gridY = gridY;      // 網格座標 Y
        this.spriteImage = spriteImage;  // 角色圖片
        this.isLoaded = false;   // 圖片是否載入完成
        this.isEnemy = isEnemy;  // 是否為敵人
        
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
        
        // 設置像素完美渲染
        ctx.imageSmoothingEnabled = false;
        
        // 計算格子的基礎位置
        const cellX = this.gridX * GAME_CONFIG.CELL_SIZE + offsetX;
        const cellY = this.gridY * GAME_CONFIG.CELL_SIZE + offsetY;
        
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
        
        // 從原圖中擷取指定區域並繪製到置中位置
        ctx.drawImage(
            this.spriteImage,
            GAME_CONFIG.CHAR_SPRITE_X,     // 源圖 X
            GAME_CONFIG.CHAR_SPRITE_Y,     // 源圖 Y
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
        
        // 移動系統
        this.selectedCharacter = null;
        this.movementRange = [];
        
        // 攻擊系統
        this.attackRange = [];
        this.gameState = 'normal'; // 'normal', 'moving', 'attacking'
        
        // 回合制系統
        this.currentTurn = 'player'; // 'player', 'enemy'
        this.turnIndicator = null;
        
        // 行動菜單系統
        this.actionMenu = null;
        this.originalPosition = null; // 記錄移動前的位置
        
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
                spd: 7,
                mv: 3,
                range: 1
            };
            
            // 創建主角並放在 (6, 4) 位置
            const player = new Character(6, 4, playerSpriteImage, playerStats, false);
            player.isLoaded = true;
            
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
                spd: 6,
                mv: 2,
                range: 1
            };
            
            // 創建敵人並放在 (8, 5) 位置
            const enemy = new Character(8, 5, enemySpriteImage, enemyStats, true);
            enemy.isLoaded = true;
            
            this.characters = [player, enemy];
            
            console.log('角色初始化完成');
            console.log('主角屬性:', player.getStatusInfo());
            console.log('敵人屬性:', enemy.getStatusInfo());
            this.redrawBattleScene();
            
        } catch (error) {
            console.error('角色初始化失敗:', error);
        }
    }

    // 初始化戰鬥頁面
    initializeBattlePage() {
        this.battleCanvas = document.getElementById('battleCanvas');
        this.battleContainer = document.getElementById('battleContainer');
        this.actionMenu = document.getElementById('actionMenu');
        this.turnIndicator = document.getElementById('turnIndicator');
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
        // 只允許選擇我方角色，且必須是玩家回合
        if (character.isEnemy || this.currentTurn !== 'player') {
            console.log(character.isEnemy ? '無法選擇敵人' : '不是玩家回合');
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
        this.endTurn();
    }
    
    // 待機
    standby() {
        console.log('選擇待機，結束回合');
        this.hideActionMenu();
        this.endTurn();
    }
    
    // 取消移動
    cancelMovement() {
        if (this.originalPosition && this.selectedCharacter) {
            console.log('取消移動，回到原位置');
            this.selectedCharacter.gridX = this.originalPosition.x;
            this.selectedCharacter.gridY = this.originalPosition.y;
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
        
        if (isDead) {
            console.log(`${target.isEnemy ? '敵人' : '我方'}被擊敗!`);
        }
        
        // 攻擊後結束回合
        this.endTurn();
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
        if (!action) {
            console.log('敵人無法行動');
            this.endTurn();
            return;
        }
        
        // 移動
        if (action.moveX !== enemy.gridX || action.moveY !== enemy.gridY) {
            console.log(`敵人移動到 (${action.moveX}, ${action.moveY})`);
            enemy.gridX = action.moveX;
            enemy.gridY = action.moveY;
            this.redrawBattleScene();
        }
        
        // 攻擊
        if (action.type === 'attack') {
            setTimeout(() => {
                console.log('敵人發動攻擊!');
                this.performAttack(enemy, action.target);
            }, 500);
        } else {
            // 只移動的話直接結束回合
            setTimeout(() => {
                this.endTurn();
            }, 500);
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
        
        // 繪製所有角色
        this.characters.forEach(character => {
            character.draw(this.battleCtx);
        });
    }

    // 更新戰鬥畫面位置和縮放
    updateBattlePosition() {
        if (this.battleCanvas) {
            const translateX = -50 + (this.battleOffsetX / window.innerWidth) * 100;
            const translateY = -50 + (this.battleOffsetY / window.innerHeight) * 100;
            const scale = this.zoomLevel;
            this.battleCanvas.style.transform = `translate(${translateX}%, ${translateY}%) scale(${scale})`;
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
                        // 移動模式下，選擇新角色
                        this.selectCharacter(clickedCharacter);
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
                        // 普通模式下選擇角色
                        this.selectCharacter(clickedCharacter);
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
                            // 移動角色
                            this.selectedCharacter.gridX = gridX;
                            this.selectedCharacter.gridY = gridY;
                            // 設置為移動後狀態
                            this.gameState = 'moved';
                            this.movementRange = [];
                            this.showActionMenu(this.selectedCharacter);
                            this.redrawBattleScene();
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
