const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 設定靜態檔案目錄
app.use(express.static(__dirname));

// 根路由 - 提供 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API 路由 - 提供問候語 API
app.get('/api/greeting', (req, res) => {
    const greetings = [
        'Hello World! 🌍',
        '你好，世界！ 👋',
        'Bonjour le monde! 🇫🇷',
        '¡Hola Mundo! 🇪🇸',
        'こんにちは世界！ 🇯🇵'
    ];
    
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    res.json({ 
        message: randomGreeting,
        timestamp: new Date().toISOString()
    });
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`🚀 伺服器正在運行於 http://localhost:${PORT}`);
    console.log(`📁 提供靜態檔案從: ${__dirname}`);
    console.log(`🌐 在瀏覽器中打開 http://localhost:${PORT} 來查看 Hello World 應用程式`);
});
