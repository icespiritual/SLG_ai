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
    constructor(gridX, gridY, spriteImage) {
        this.gridX = gridX;      // 網格座標 X
        this.gridY = gridY;      // 網格座標 Y
        this.spriteImage = spriteImage;  // 角色圖片
        this.isLoaded = false;   // 圖片是否載入完成
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
        
        // 角色系統
        this.characters = [];
        this.characterSprites = {};
        
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
    loadCharacterSprite(filename) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.characterSprites[filename] = img;
                resolve(img);
            };
            img.onerror = (error) => {
                console.error(`無法載入角色圖片: ${filename}`, error);
                reject(error);
            };
            img.src = `chara/${filename}`;
        });
    }

    // 初始化角色
    async initializeCharacters() {
        try {
            // 載入角色圖片
            const spriteImage = await this.loadCharacterSprite('000.png');
            
            // 創建角色並放在 (6, 4) 位置
            const character = new Character(6, 4, spriteImage);
            character.isLoaded = true;
            
            this.characters = [character];
            
            console.log('角色初始化完成');
            this.redrawBattleScene();
            
        } catch (error) {
            console.error('角色初始化失敗:', error);
        }
    }

    // 初始化戰鬥頁面
    initializeBattlePage() {
        this.battleCanvas = document.getElementById('battleCanvas');
        this.battleContainer = document.getElementById('battleContainer');
        this.battleCtx = this.battleCanvas.getContext('2d');
        
        // 重置拖曳狀態
        this.isDragging = false;
        this.battleOffsetX = 0;
        this.battleOffsetY = 0;
        
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

    // 重繪整個戰鬥場景
    redrawBattleScene() {
        if (!this.battleCtx) return;
        
        // 清空畫布
        this.battleCtx.clearRect(0, 0, this.battleCanvas.width, this.battleCanvas.height);
        
        // 重繪網格
        this.drawBattleGrid();
        
        // 繪製所有角色
        this.characters.forEach(character => {
            character.draw(this.battleCtx);
        });
    }

    // 更新戰鬥畫面位置
    updateBattlePosition() {
        if (this.battleCanvas) {
            const translateX = -50 + (this.battleOffsetX / window.innerWidth) * 100;
            const translateY = -50 + (this.battleOffsetY / window.innerHeight) * 100;
            this.battleCanvas.style.transform = `translate(${translateX}%, ${translateY}%)`;
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

    handleBattleClick(e) {
        // 只有在沒有拖曳的情況下才處理點擊
        if (!this.isDragging && this.battleCanvas && e.target === this.battleCanvas) {
            const rect = this.battleCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const gridX = Math.floor(x / GAME_CONFIG.CELL_SIZE);
            const gridY = Math.floor(y / GAME_CONFIG.CELL_SIZE);
            
            console.log(`點擊網格位置: (${gridX}, ${gridY})`);
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
