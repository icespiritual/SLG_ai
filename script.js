// 戰棋遊戲主程式

// 遊戲配置
const GAME_CONFIG = {
    // 戰鬥網格配置
    GRID_COLS: 12,  // 網格列數
    GRID_ROWS: 8,   // 網格行數
    CELL_SIZE: 200,  // 每個格子的大小(像素) - 放大4倍 (50 * 4 = 200)
};

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
