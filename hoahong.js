// hoahong.js - Quản lý điểm hoa hồng 🌷 (XỬ LÝ NGAY - KHÔNG ĐỢI AI)
(function() {
    const STORAGE_KEY = 'domino_hoahong';
    const STARTING_POINTS = 1000;
    const BONUS_FIRST = 10;
    const BONUS_SECOND = 5;
    const PENALTY_THIRD = -5;
    const PENALTY_FOURTH = -10;
    const RESET_AMOUNT = 200;

    // Dữ liệu điểm của người chơi
    let playerPoints = {};
    let isProcessing = false;
    let isUpdating = false;
    let lastRankings = [];
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let watchInterval = null;
    let isWatching = false;
    let isInitialized = false;
    
    // Biến kiểm soát
    let lastProcessedTime = 0;
    let isProcessingResult = false;
    let processedRankings = [];

    // Khởi tạo điểm cho người chơi
    function initPlayerPoints() {
        const players = ['Tôi', 'Bot Tây', 'Bot Bắc', 'Bot Đông'];
        const saved = localStorage.getItem(STORAGE_KEY);
        
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                let allExist = true;
                for (let name of players) {
                    if (!(name in parsed)) {
                        allExist = false;
                        break;
                    }
                }
                if (allExist) {
                    playerPoints = parsed;
                    console.log('📊 Đã tải dữ liệu hoa hồng từ storage');
                    updateHoahongDisplay();
                    return;
                }
            } catch(e) {
                console.warn('Lỗi đọc storage, khởi tạo mới');
            }
        }

        playerPoints = {};
        for (let name of players) {
            playerPoints[name] = STARTING_POINTS;
        }
        savePoints();
        console.log('📊 Đã khởi tạo hoa hồng mới');
        updateHoahongDisplay();
    }

    // Lưu điểm vào storage
    function savePoints() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(playerPoints));
        } catch(e) {
            console.warn('Lỗi lưu storage:', e);
        }
    }

    // Lấy điểm của một người chơi
    function getPlayerPoints(name) {
        return playerPoints[name] || 0;
    }

    // Cập nhật điểm cho một người chơi
    function updatePlayerPoints(name, change) {
        if (!(name in playerPoints)) {
            playerPoints[name] = STARTING_POINTS;
        }
        playerPoints[name] += change;
        
        if (playerPoints[name] <= 0) {
            playerPoints[name] = RESET_AMOUNT;
            showResetNotification(name);
        }
        
        savePoints();
        updateHoahongDisplay();
    }

    // ===== CẬP NHẬT HIỂN THỊ HOÀ HỒNG =====
    function updateHoahongDisplay() {
        if (isUpdating) return;
        isUpdating = true;

        try {
            const players = ['Tôi', 'Bot Tây', 'Bot Bắc', 'Bot Đông'];
            
            for (let name of players) {
                const element = document.getElementById(`hh${name}`);
                if (element) {
                    const points = getPlayerPoints(name);
                    element.textContent = `🌷 ${points}`;
                    element.style.color = '#ffdd44';
                    element.style.fontWeight = 'bold';
                    element.style.textShadow = '0 0 10px rgba(255, 220, 0, 0.3)';
                }
            }
            
            updateScoreBoard();
            
        } catch(e) {
            console.warn('Lỗi cập nhật hoa hồng:', e);
        }

        isUpdating = false;
    }

    // Cập nhật bảng điểm
    function updateScoreBoard() {
        const scoreContent = document.getElementById('scoreContent');
        if (!scoreContent) return;
        
        const players = ['Tôi', 'Bot Tây', 'Bot Bắc', 'Bot Đông'];
        let html = '';
        const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣'];
        
        const sorted = players.map(name => ({
            name: name,
            points: getPlayerPoints(name)
        })).sort((a, b) => b.points - a.points);
        
        for (let i = 0; i < sorted.length; i++) {
            const p = sorted[i];
            const isFirst = i === 0;
            html += `
                <div class="score-row" style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="${isFirst ? 'color:#ffdd44;font-weight:bold;' : ''}">${rankEmojis[i]} ${p.name}</span>
                    <span style="color:#ffdd44;font-weight:bold;">🌷 ${p.points}</span>
                </div>
            `;
        }
        scoreContent.innerHTML = html;
    }

    // Tạo bảng điểm hoa hồng có thể di chuyển
    function createScoreBoard() {
        if (document.getElementById('scoreBoard')) {
            updateScoreBoard();
            return;
        }
        
        const board = document.createElement('div');
        board.id = 'scoreBoard';
        board.style.cssText = `
            position: fixed;
            top: 55px;
            right: 10px;
            z-index: 999;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #ffdd44;
            border-radius: 12px;
            padding: 10px 15px;
            min-width: 160px;
            box-shadow: 0 0 30px rgba(255, 220, 0, 0.2);
            display: none;
            cursor: move;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            color: #ffdd44;
            font-weight: bold;
            text-align: center;
            border-bottom: 2px solid #ffdd44;
            padding-bottom: 8px;
            margin-bottom: 8px;
            font-size: 15px;
            cursor: move;
        `;
        title.textContent = '🌷BẢNG HOA HỒNG🌷';
        board.appendChild(title);
        
        const content = document.createElement('div');
        content.id = 'scoreContent';
        board.appendChild(content);
        
        document.body.appendChild(board);
        
        const toggleBtn = document.getElementById('toggleScoreBtn');
        if (!toggleBtn) {
            const btn = document.createElement('button');
            btn.id = 'toggleScoreBtn';
            btn.textContent = '🌷';
            btn.style.cssText = `
                position: fixed;
                top: 55px;
                right: 10px;
                z-index: 1000;
                background: rgba(0, 0, 0, 0.85);
                border: 2px solid #ffdd44;
                border-radius: 50%;
                width: 44px;
                height: 44px;
                font-size: 22px;
                cursor: grab;
                color: #ffdd44;
                box-shadow: 0 0 20px rgba(255, 220, 0, 0.2);
                transition: all 0.3s;
                user-select: none;
            `;
            
            btn.addEventListener('mousedown', function(e) {
                isDragging = true;
                const rect = this.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
                this.style.cursor = 'grabbing';
                this.style.transform = 'scale(1.15)';
            });

            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                const btn = document.getElementById('toggleScoreBtn');
                if (!btn) return;
                
                let x = e.clientX - dragOffsetX;
                let y = e.clientY - dragOffsetY;
                
                x = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, x));
                y = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, y));
                
                btn.style.left = x + 'px';
                btn.style.top = y + 'px';
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
            });

            document.addEventListener('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    const btn = document.getElementById('toggleScoreBtn');
                    if (btn) {
                        btn.style.cursor = 'grab';
                        btn.style.transform = 'scale(1)';
                    }
                }
            });

            btn.addEventListener('touchstart', function(e) {
                const touch = e.touches[0];
                const rect = this.getBoundingClientRect();
                dragOffsetX = touch.clientX - rect.left;
                dragOffsetY = touch.clientY - rect.top;
                isDragging = true;
                this.style.transform = 'scale(1.15)';
            }, { passive: true });

            document.addEventListener('touchmove', function(e) {
                if (!isDragging) return;
                const touch = e.touches[0];
                const btn = document.getElementById('toggleScoreBtn');
                if (!btn) return;
                
                let x = touch.clientX - dragOffsetX;
                let y = touch.clientY - dragOffsetY;
                
                x = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, x));
                y = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, y));
                
                btn.style.left = x + 'px';
                btn.style.top = y + 'px';
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
            }, { passive: true });

            document.addEventListener('touchend', function() {
                if (isDragging) {
                    isDragging = false;
                    const btn = document.getElementById('toggleScoreBtn');
                    if (btn) {
                        btn.style.transform = 'scale(1)';
                    }
                }
            });

            btn.addEventListener('mouseenter', function() {
                if (!isDragging) {
                    this.style.transform = 'scale(1.1)';
                    this.style.boxShadow = '0 0 30px rgba(255, 220, 0, 0.4)';
                }
            });
            btn.addEventListener('mouseleave', function() {
                if (!isDragging) {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '0 0 20px rgba(255, 220, 0, 0.2)';
                }
            });
            
            btn.addEventListener('click', function() {
                if (isDragging) return;
                const board = document.getElementById('scoreBoard');
                if (board) {
                    if (board.style.display === 'block') {
                        board.style.display = 'none';
                        this.textContent = '🌷';
                    } else {
                        board.style.display = 'block';
                        this.textContent = '✕';
                        updateScoreBoard();
                    }
                }
            });
            document.body.appendChild(btn);
        }
    }

    // Hiển thị thông báo tặng 200 🌷
    function showResetNotification(name) {
        const notification = document.createElement('div');
        notification.id = 'resetNotification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 99999;
            background: #cc0000;
            border: 4px solid #ffdd44;
            border-radius: 20px;
            padding: 30px 40px;
            min-width: 320px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 0 60px rgba(255, 0, 0, 0.6), 0 0 120px rgba(255, 200, 0, 0.3);
            animation: resetPulse 0.8s ease-in-out infinite;
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            color: #ffdd44;
            text-shadow: 0 0 20px rgba(255, 220, 0, 0.5);
            margin-bottom: 10px;
        `;
        title.textContent = '🎉 TẶNG 200 🌷';
        notification.appendChild(title);

        const message = document.createElement('div');
        message.style.cssText = `
            font-size: 18px;
            color: #ffffff;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(255,255,255,0.3);
            line-height: 1.6;
        `;
        message.innerHTML = `Cho <span style="color: #ffdd44; font-size: 22px;">${name}</span><br>Chơi Cho Vui Nha Hihihi...! 😄`;
        notification.appendChild(message);

        const emoji = document.createElement('div');
        emoji.style.cssText = `
            font-size: 30px;
            margin-top: 10px;
        `;
        emoji.textContent = '🌷🌷🌷';
        notification.appendChild(emoji);

        document.body.appendChild(notification);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes resetPulse {
                0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 60px rgba(255, 0, 0, 0.6), 0 0 120px rgba(255, 200, 0, 0.3); }
                50% { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 0 80px rgba(255, 0, 0, 0.8), 0 0 160px rgba(255, 200, 0, 0.5); }
                100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 60px rgba(255, 0, 0, 0.6), 0 0 120px rgba(255, 200, 0, 0.3); }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            if (notification) {
                notification.style.transition = 'opacity 0.5s ease';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }
        }, 3000);
    }

    // ===== XỬ LÝ KẾT QUẢ - LẤY 4 NGƯỜI TỪ BẢNG =====
    function processGameResult(rankings) {
        if (isProcessingResult) {
            console.log('⏳ Đang xử lý kết quả, bỏ qua...');
            return;
        }
        
        // Kiểm tra xem đã xử lý kết quả này chưa
        const key = rankings.join('|');
        if (processedRankings.includes(key)) {
            console.log('📊 Kết quả đã được xử lý trước đó, bỏ qua');
            return;
        }
        
        console.log('📊 Xử lý kết quả mới:', rankings);
        processedRankings.push(key);
        isProcessingResult = true;

        // 4 vị trí: Nhất, Nhì, Ba, Cuối
        const bonuses = [BONUS_FIRST, BONUS_SECOND, PENALTY_THIRD, PENALTY_FOURTH];
        const results = [];
        
        // Duyệt qua 4 vị trí
        for (let i = 0; i < 4; i++) {
            const name = rankings[i] || 'Bot Bắc'; // Nếu thiếu, mặc định là Bot Bắc
            const change = bonuses[i];
            const oldPoints = getPlayerPoints(name);
            updatePlayerPoints(name, change);
            const newPoints = getPlayerPoints(name);
            results.push({
                name: name,
                change: change,
                oldPoints: oldPoints,
                newPoints: newPoints
            });
        }

        // Hiển thị bảng kết quả hoa hồng
        setTimeout(() => {
            showHoahongResult(results);
        }, 500);

        setTimeout(() => {
            isProcessingResult = false;
            console.log('✅ Đã xử lý xong kết quả');
        }, 3000);
    }

    // ===== HIỂN THỊ BẢNG KẾT QUẢ HOA HỒNG =====
    function showHoahongResult(results) {
        const oldBoard = document.getElementById('hoahongResult');
        if (oldBoard) {
            oldBoard.parentNode.removeChild(oldBoard);
        }

        const board = document.createElement('div');
        board.id = 'hoahongResult';
        board.style.cssText = `
            position: fixed;
            top: 12%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99998;
            background: linear-gradient(135deg, #00a86b, #0088aa);
            border: 4px solid #ffdd44;
            border-radius: 20px;
            padding: 20px 30px;
            min-width: 320px;
            max-width: 420px;
            box-shadow: 0 0 50px rgba(0, 168, 107, 0.5), 0 0 100px rgba(255, 220, 0, 0.2);
            animation: slideDown 0.5s ease;
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            color: #ffdd44;
            text-shadow: 0 0 20px rgba(255, 220, 0, 0.4);
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 2px solid rgba(255, 220, 68, 0.3);
            padding-bottom: 8px;
        `;
        title.textContent = '🌷 KẾT QUẢ HOA HỒNG 🌷';
        board.appendChild(title);

        const rankNames = ['🥇 Nhất', '🥈 Nhì', '🥉 Ba', '4️⃣ Cuối'];
        const changeColors = {
            'positive': '#44ff88',
            'negative': '#ff4444'
        };

        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 10px;
                margin: 3px 0;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #ffffff;
                font-size: 14px;
            `;

            const nameSpan = document.createElement('span');
            nameSpan.style.cssText = `
                font-weight: 600;
                min-width: 80px;
            `;
            nameSpan.textContent = `${rankNames[i]} ${r.name}`;
            row.appendChild(nameSpan);

            const changeSpan = document.createElement('span');
            const isPositive = r.change >= 0;
            changeSpan.style.cssText = `
                font-weight: bold;
                color: ${isPositive ? changeColors.positive : changeColors.negative};
                margin: 0 8px;
            `;
            changeSpan.textContent = `${isPositive ? '+' : ''}${r.change} 🌷`;
            row.appendChild(changeSpan);

            const totalSpan = document.createElement('span');
            totalSpan.style.cssText = `
                font-weight: bold;
                color: #ffdd44;
                background: rgba(0,0,0,0.2);
                padding: 2px 10px;
                border-radius: 12px;
                font-size: 13px;
            `;
            totalSpan.textContent = `${r.oldPoints} → ${r.newPoints} 🌷`;
            row.appendChild(totalSpan);

            board.appendChild(row);
        }

        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            background: rgba(255,255,255,0.15);
            border: 1px solid #ffdd44;
            border-radius: 12px;
            padding: 6px 20px;
            color: #ffdd44;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
            width: 100%;
            font-size: 14px;
            transition: all 0.3s;
        `;
        closeBtn.textContent = '✅ OK';
        closeBtn.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,255,255,0.25)';
        });
        closeBtn.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255,255,255,0.15)';
        });
        closeBtn.addEventListener('click', function() {
            if (board.parentNode) {
                board.style.transition = 'opacity 0.3s ease';
                board.style.opacity = '0';
                setTimeout(() => {
                    if (board.parentNode) {
                        board.parentNode.removeChild(board);
                    }
                }, 300);
            }
        });
        board.appendChild(closeBtn);

        document.body.appendChild(board);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                0% { transform: translateX(-50%) translateY(-50px); opacity: 0; }
                100% { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // ===== LẤY XẾP HẠNG TỪ BẢNG KẾT QUẢ - XỬ LÝ NGAY =====
    function extractRankings() {
        console.log('🔍 extractRankings được gọi...');
        
        const resultBoard = document.getElementById('resultBoard');
        if (!resultBoard || !resultBoard.classList.contains('show')) {
            console.log('⏳ resultBoard chưa hiển thị');
            return false;
        }

        const content = document.getElementById('resultContent');
        if (!content) {
            console.log('❌ Không tìm thấy resultContent');
            return false;
        }

        const rankElements = content.querySelectorAll('.rank');
        if (rankElements.length === 0) {
            console.log('❌ Không tìm thấy .rank elements');
            return false;
        }

        console.log('✅ Tìm thấy', rankElements.length, 'rank elements');

        // Tạo mảng 4 vị trí mặc định
        const rankings = ['Tôi', 'Bot Tây', 'Bot Bắc', 'Bot Đông'];
        const foundRankings = [];
        const names = ['Tôi', 'Bot Tây', 'Bot Bắc', 'Bot Đông'];
        
        // Lấy danh sách theo thứ tự từ bảng kết quả
        for (let el of rankElements) {
            const text = el.textContent;
            for (let name of names) {
                if (text.includes(name)) {
                    foundRankings.push(name);
                    break;
                }
            }
        }

        console.log('📊 Rankings tìm thấy:', foundRankings);

        // Nếu tìm thấy ít nhất 1 người, xử lý ngay
        if (foundRankings.length > 0) {
            // Đảm bảo có đủ 4 vị trí
            const finalRankings = [];
            for (let name of names) {
                if (foundRankings.includes(name)) {
                    finalRankings.push(name);
                }
            }
            // Thêm những người còn thiếu vào cuối
            for (let name of names) {
                if (!finalRankings.includes(name)) {
                    finalRankings.push(name);
                }
            }
            
            console.log('📊 Xếp hạng cuối cùng:', finalRankings.join(' → '));
            
            const key = finalRankings.join('|');
            if (processedRankings.includes(key)) {
                console.log('📊 Kết quả đã được xử lý, bỏ qua');
                return true;
            }
            
            lastProcessedTime = Date.now();
            processGameResult(finalRankings);
            return true;
        } else {
            console.log('⚠️ Không tìm thấy người chơi nào trong bảng kết quả');
            return false;
        }
    }

    // ===== RESET KHI BẮT ĐẦU VÁN MỚI =====
    function resetForNewGame() {
        console.log('🔄 Reset hoa hồng cho ván mới');
        isProcessingResult = false;
        lastRankings = [];
        lastProcessedTime = 0;
        
        const oldBoard = document.getElementById('hoahongResult');
        if (oldBoard) {
            oldBoard.parentNode.removeChild(oldBoard);
        }
        
        setTimeout(() => {
            updateHoahongDisplay();
        }, 300);
    }

    // ===== THEO DÕI BẢNG KẾT QUẢ =====
    function watchResultBoard() {
        if (watchInterval) {
            clearInterval(watchInterval);
        }
        
        if (!isWatching) {
            console.log('👀 Bắt đầu theo dõi bảng kết quả...');
            isWatching = true;
        }
        
        watchInterval = setInterval(() => {
            const resultBoard = document.getElementById('resultBoard');
            if (resultBoard && resultBoard.classList.contains('show')) {
                console.log('📋 [watch] Phát hiện bảng kết quả đang hiển thị');
                extractRankings();
            }
        }, 500); // Giảm xuống 500ms để phản hồi nhanh
    }

    // Lấy điểm hiện tại của tất cả người chơi
    function getAllPoints() {
        return { ...playerPoints };
    }

    // Reset toàn bộ dữ liệu
    function resetAllPoints() {
        const players = ['Tôi', 'Bot Tây', 'Bot Bắc', 'Bot Đông'];
        for (let name of players) {
            playerPoints[name] = STARTING_POINTS;
        }
        savePoints();
        updateHoahongDisplay();
        lastRankings = [];
        isProcessingResult = false;
        processedRankings = [];
        lastProcessedTime = 0;
        console.log('🔄 Đã reset hoa hồng về mặc định');
    }

    // ===== KIỂM TRA BẮT BUỘC =====
    function forceCheckResult() {
        console.log('🔍 Force check result board...');
        const resultBoard = document.getElementById('resultBoard');
        if (resultBoard && resultBoard.classList.contains('show')) {
            console.log('📋 Bảng kết quả đang hiển thị, trích xuất ngay!');
            return extractRankings();
        }
        console.log('⏳ Bảng kết quả chưa hiển thị');
        return false;
    }

    // ===== KHỞI TẠO =====
    function init() {
        if (isInitialized) {
            console.log('🌷 Hoahong.js đã được khởi tạo, bỏ qua...');
            return;
        }
        
        console.log('🌷 Khởi tạo Hoahong.js...');
        isInitialized = true;
        
        initPlayerPoints();
        
        setTimeout(() => {
            createScoreBoard();
            updateScoreBoard();
            const board = document.getElementById('scoreBoard');
            const btn = document.getElementById('toggleScoreBtn');
            if (board && btn) {
                board.style.display = 'block';
                btn.textContent = '✕';
            }
        }, 500);

        setTimeout(() => {
            watchResultBoard();
        }, 1000);

        document.addEventListener('gameReloaded', function() {
            console.log('🔄 Game đã reload, reset hoa hồng...');
            setTimeout(() => {
                resetForNewGame();
                setTimeout(() => {
                    forceCheckResult();
                }, 1000);
            }, 500);
        });

        setTimeout(() => {
            console.log('🔍 Kiểm tra bảng kết quả sau khởi tạo...');
            forceCheckResult();
        }, 1500);

        const resultClose = document.getElementById('resultClose');
        if (resultClose) {
            resultClose.addEventListener('click', function() {
                console.log('🔄 Đóng bảng kết quả, reset trạng thái');
                setTimeout(() => {
                    processedRankings = [];
                    lastProcessedTime = 0;
                    isProcessingResult = false;
                }, 500);
            });
        }

        console.log('🌷 Hoahong.js đã sẵn sàng!');
        console.log('📊 Mỗi người chơi bắt đầu với 1000 🌷');
    }

    // Expose các hàm
    window.hoahong = {
        getPoints: getPlayerPoints,
        getAllPoints: getAllPoints,
        reset: resetAllPoints,
        processResult: processGameResult,
        updatePoints: updatePlayerPoints,
        updateDisplay: updateHoahongDisplay,
        showBoard: createScoreBoard,
        extractRankings: extractRankings,
        watch: watchResultBoard,
        resetForNewGame: resetForNewGame,
        init: init,
        forceCheck: forceCheckResult,
        clearProcessed: function() {
            processedRankings = [];
            lastProcessedTime = 0;
            isProcessingResult = false;
            console.log('🔄 Đã clear processed rankings');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    console.log('✅ Hoahong.js đã được tải thành công!');
})();