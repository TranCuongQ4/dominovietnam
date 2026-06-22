(function() {
    const PLAYER_NAMES = ['Tôi', 'Bot Tây', 'Bot Bắc', 'Bot Đông'];
    let currentPlayer = 0;
    let hands = [[], [], [], []];
    let playedTiles = [];
    let boardEnds = { left: null, right: null };
    let gameOver = false;
    let selectedTileIndex = -1;
    let isProcessing = false;

    // Quản lý thứ hạng theo luật Việt Nam mới
    let finishedPlayers = [];

    const boardArea = document.getElementById('boardArea');
    const myTilesContainer = document.getElementById('myTilesContainer');
    const botWestCards = document.getElementById('botWestCards');
    const botNorthCards = document.getElementById('botNorthCards');
    const botEastCards = document.getElementById('botEastCards');
    const botWestCount = document.getElementById('botWestCount');
    const botNorthCount = document.getElementById('botNorthCount');
    const botEastCount = document.getElementById('botEastCount');
    const toast = document.getElementById('toastMessage');
    const toastText = document.getElementById('toastText');
    const toastClose = document.getElementById('toastClose');
    const resultBoard = document.getElementById('resultBoard');
    const resultContent = document.getElementById('resultContent');
    const resultClose = document.getElementById('resultClose');
	
	const BOT_DELAY = 2000;
	const BOT_ACTION_DELAY = 500;

    let isChoosingDirection = false;
    let pendingTileForDirection = null;
    let forcedDirection = null;

    window.currentPlayer = currentPlayer;

    function createDominoSet() {
        const set = [];
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                set.push([i, j]);
            }
        }
        return set;
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function dealCards() {
        const deck = shuffle(createDominoSet());
        hands = [[], [], [], []];
        for (let i = 0; i < 28; i++) {
            hands[i % 4].push(deck[i]);
        }
    }

    function findFirstPlayer() {
        for (let i = 0; i < 4; i++) {
            if (hands[i].some(t => t[0] === 6 && t[1] === 6)) return i;
        }
        let maxVal = -1, maxIdx = 0;
        for (let i = 0; i < 4; i++) {
            for (let t of hands[i]) {
                const val = t[0] + t[1];
                if (val > maxVal) { maxVal = val; maxIdx = i; }
            }
        }
        return maxIdx;
    }
	
    function initGame() {
        gameOver = false;
        playedTiles = [];
        boardEnds = { left: null, right: null };
        selectedTileIndex = -1;
        isProcessing = false;
        finishedPlayers = [];
        isChoosingDirection = false;
        pendingTileForDirection = null;
        forcedDirection = null;
        
        // Ẩn kết quả
        const resultBoard = document.getElementById('resultBoard');
        if (resultBoard) {
            resultBoard.classList.remove('show');
        }
        
        // Ẩn hộp chọn hướng
        hideDirectionChooser();

        // CHỈ GỌI dealCards() 1 LẦN
        dealCards();
        currentPlayer = findFirstPlayer();
        window.currentPlayer = currentPlayer;
        console.log('🎯 initGame: currentPlayer =', currentPlayer);

        const firstPlayer = currentPlayer;
        const tile66 = hands[firstPlayer].findIndex(t => t[0] === 6 && t[1] === 6);
        
        if (tile66 !== -1) {
            const tile = hands[firstPlayer].splice(tile66, 1)[0];
            playedTiles.push({ tile, player: firstPlayer, connectSide: 'right', isReversed: false });
            boardEnds.left = 6;
            boardEnds.right = 6;
        } else {
            let maxSum = -1, idx = -1;
            for (let i = 0; i < hands[firstPlayer].length; i++) {
                const s = hands[firstPlayer][i][0] + hands[firstPlayer][i][1];
                if (s > maxSum) { maxSum = s; idx = i; }
            }
            if (idx !== -1) {
                const tile = hands[firstPlayer].splice(idx, 1)[0];
                playedTiles.push({ tile, player: firstPlayer, connectSide: 'right', isReversed: false });
                boardEnds.left = tile[0];
                boardEnds.right = tile[1];
            }
        }

        moveToNextPlayer();
        renderAll();
        
        if (currentPlayer !== 0 && !gameOver) {
            setTimeout(() => botTurn(), 2000);
        }
    }

    // ... (giữ nguyên tất cả các hàm khác từ canPlay đến renderDots) ...

    // ===== SỬA NÚT VÁN MỚI =====
    document.getElementById('btnNewGame').addEventListener('click', function() {
        // Reload trang để bắt đầu ván mới hoàn toàn
        window.location.reload();
    });

    function canPlay(tile, leftVal, rightVal) {
        return tile[0] === leftVal || tile[1] === leftVal ||
               tile[0] === rightVal || tile[1] === rightVal;
    }

    // ===== HÀM KIỂM TRA ĐÁNH ĐƯỢC CẢ 2 ĐẦU =====
    function canPlayBothEnds(tile) {
        const leftVal = boardEnds.left;
        const rightVal = boardEnds.right;
        if (leftVal === null || rightVal === null) return false;
        const canLeft = tile[0] === leftVal || tile[1] === leftVal;
        const canRight = tile[0] === rightVal || tile[1] === rightVal;
        return canLeft && canRight;
    }

    // ===== HIỂN THỊ HỘP CHỌN HƯỚNG =====
    function showDirectionChooser(tile, tileIndex) {
        // Tạo hộp chọn nếu chưa có
        let chooser = document.getElementById('directionChooser');
        if (!chooser) {
            chooser = document.createElement('div');
            chooser.id = 'directionChooser';
            chooser.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                background: rgba(0, 0, 0, 0.95);
                padding: 30px 40px;
                border-radius: 20px;
                border: 3px solid #ffdd44;
                box-shadow: 0 0 60px rgba(255, 220, 0, 0.4);
                display: none;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                min-width: 300px;
                backdrop-filter: blur(10px);
            `;
            document.body.appendChild(chooser);

            // Thêm CSS animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes chooserPulse {
                    0% { box-shadow: 0 0 30px rgba(255, 220, 0, 0.2); }
                    50% { box-shadow: 0 0 70px rgba(255, 220, 0, 0.5); }
                    100% { box-shadow: 0 0 30px rgba(255, 220, 0, 0.2); }
                }
                #directionChooser {
                    animation: chooserPulse 1.5s ease-in-out infinite;
                }
            `;
            document.head.appendChild(style);
        }

        // Xóa nội dung cũ
        chooser.innerHTML = '';

        // Tiêu đề
        const title = document.createElement('div');
        title.style.cssText = `
            color: #ffdd44;
            font-size: 22px;
            font-weight: bold;
            text-shadow: 0 0 30px rgba(255, 220, 0, 0.3);
            margin-bottom: 5px;
        `;
        title.textContent = '🎯 CHỌN HƯỚNG ĐÁNH';
        chooser.appendChild(title);

        // Thông tin quân cờ
        const tileInfo = document.createElement('div');
        tileInfo.style.cssText = `
            color: #ffffff;
            font-size: 20px;
            background: rgba(255,255,255,0.1);
            padding: 12px 25px;
            border-radius: 10px;
            margin-bottom: 5px;
            font-weight: bold;
        `;
        tileInfo.textContent = `Quân cờ: [${tile[0]} | ${tile[1]}]`;
        chooser.appendChild(tileInfo);

        // Hiển thị 2 đầu cờ
        const endsInfo = document.createElement('div');
        endsInfo.style.cssText = `
            color: #aaccff;
            font-size: 15px;
            margin-bottom: 10px;
            background: rgba(0,0,0,0.3);
            padding: 8px 15px;
            border-radius: 8px;
        `;
        endsInfo.innerHTML = `
            <span style="color: #44ff88;">⬅ Đầu trái: ${boardEnds.left}</span>  
            <span style="color: #ff8844;">|  Đầu phải: ${boardEnds.right} ➡</span>
        `;
        chooser.appendChild(endsInfo);

        // Container cho nút
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = `
            display: flex;
            gap: 20px;
            width: 100%;
            justify-content: center;
            margin-top: 5px;
        `;

        // Nút đánh trái
        const leftBtn = document.createElement('button');
        leftBtn.style.cssText = `
            background: linear-gradient(135deg, #1a4a2a, #2a6a3a);
            border: 2px solid #44ff88;
            border-radius: 12px;
            padding: 14px 30px;
            font-size: 18px;
            font-weight: bold;
            color: #44ff88;
            cursor: pointer;
            flex: 1;
            transition: all 0.3s;
            text-shadow: 0 0 10px rgba(68, 255, 136, 0.3);
        `;
        leftBtn.innerHTML = '⬅ Trái';
        leftBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 0 30px rgba(68, 255, 136, 0.3)';
        });
        leftBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = 'none';
        });
        leftBtn.addEventListener('click', function() {
            // Đánh sang trái
            isChoosingDirection = false;
            hideDirectionChooser();
            // Đánh quân cờ với hướng trái
            playTileWithDirection(tile, 'left');
        });
        btnContainer.appendChild(leftBtn);

        // Nút đánh phải
        const rightBtn = document.createElement('button');
        rightBtn.style.cssText = `
            background: linear-gradient(135deg, #4a1a2a, #6a2a3a);
            border: 2px solid #ff8844;
            border-radius: 12px;
            padding: 14px 30px;
            font-size: 18px;
            font-weight: bold;
            color: #ff8844;
            cursor: pointer;
            flex: 1;
            transition: all 0.3s;
            text-shadow: 0 0 10px rgba(255, 136, 68, 0.3);
        `;
        rightBtn.innerHTML = 'Phải ➡';
        rightBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 0 30px rgba(255, 136, 68, 0.3)';
        });
        rightBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = 'none';
        });
        rightBtn.addEventListener('click', function() {
            // Đánh sang phải
            isChoosingDirection = false;
            hideDirectionChooser();
            // Đánh quân cờ với hướng phải
            playTileWithDirection(tile, 'right');
        });
        btnContainer.appendChild(rightBtn);

        chooser.appendChild(btnContainer);

        // Nút hủy
        const cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = `
            background: #3a1a1a;
            border: 1px solid #ff4444;
            border-radius: 8px;
            padding: 8px 25px;
            font-size: 14px;
            color: #ff8888;
            cursor: pointer;
            margin-top: 5px;
            transition: all 0.3s;
        `;
        cancelBtn.textContent = '❌ Hủy';
        cancelBtn.addEventListener('mouseenter', function() {
            this.style.background = '#5a2a2a';
        });
        cancelBtn.addEventListener('mouseleave', function() {
            this.style.background = '#3a1a1a';
        });
        cancelBtn.addEventListener('click', function() {
            isChoosingDirection = false;
            hideDirectionChooser();
            selectedTileIndex = -1;
            renderAll();
        });
        chooser.appendChild(cancelBtn);

        // Tạo overlay
        let overlay = document.getElementById('chooserOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'chooserOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                z-index: 9998;
            `;
            overlay.addEventListener('click', function() {
                isChoosingDirection = false;
                hideDirectionChooser();
                selectedTileIndex = -1;
                renderAll();
            });
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';

        chooser.style.display = 'flex';
        isChoosingDirection = true;
        pendingTileForDirection = tile;
    }

    // ===== ẨN HỘP CHỌN HƯỚNG =====
    function hideDirectionChooser() {
        const chooser = document.getElementById('directionChooser');
        if (chooser) chooser.style.display = 'none';
        const overlay = document.getElementById('chooserOverlay');
        if (overlay) overlay.style.display = 'none';
        isChoosingDirection = false;
        pendingTileForDirection = null;
        forcedDirection = null;
    }

    // ===== ĐÁNH QUÂN CỜ VỚI HƯỚNG ĐÃ CHỌN =====
    function playTileWithDirection(tile, direction) {
        // Kiểm tra quân cờ có hợp lệ với hướng không
        const left = boardEnds.left;
        const right = boardEnds.right;
        let isValid = false;
        
        if (direction === 'left') {
            isValid = tile[0] === left || tile[1] === left;
        } else if (direction === 'right') {
            isValid = tile[0] === right || tile[1] === right;
        }

        if (!isValid) {
            showToast('❌ Hướng đánh không hợp lệ!');
            return;
        }

        // Đặt hướng bắt buộc
        forcedDirection = direction;
        
        // Đánh quân cờ
        playTile(0, tile);
        
        // Reset hướng bắt buộc
        forcedDirection = null;
        selectedTileIndex = -1;
    }

    // Hàm chuyển lượt thông minh - SỬA
    function moveToNextPlayer() {
        if (finishedPlayers.length >= 3) {
            for (let i = 0; i < 4; i++) {
                if (!finishedPlayers.includes(i)) {
                    finishedPlayers.push(i);
                    break;
                }
            }
            endGame(false);
            return;
        }

        let nextPlayer = (currentPlayer + 1) % 4;
        while (finishedPlayers.includes(nextPlayer)) {
            nextPlayer = (nextPlayer + 1) % 4;
        }
        currentPlayer = nextPlayer;
        
        // ===== CẬP NHẬT window.currentPlayer =====
        window.currentPlayer = currentPlayer;
    }

    function checkBoardLocked() {
        if (boardEnds.left === null || boardEnds.right === null) return false;
        
        for (let i = 0; i < 4; i++) {
            if (!finishedPlayers.includes(i)) {
                const hasValid = hands[i].some(t => canPlay(t, boardEnds.left, boardEnds.right));
                if (hasValid) return false;
            }
        }
        return true;
    }

    // ===== SỬA HÀM playTile ĐỂ HỖ TRỢ HƯỚNG BẮT BUỘC =====
    function playTile(playerIdx, tile) {
        // Nếu đang chọn hướng thì không xử lý
        if (isChoosingDirection) return false;
        
        if (gameOver || playerIdx !== currentPlayer || !tile) return false;

        const left = boardEnds.left;
        const right = boardEnds.right;
        let side = '';
        let isReversed = false;

        // ===== KIỂM TRA HƯỚNG BẮT BUỘC =====
        if (forcedDirection === 'left') {
            // Bắt buộc đánh sang trái
            if (tile[0] === left || tile[1] === left) {
                side = 'left';
                isReversed = (tile[1] !== left);
                boardEnds.left = isReversed ? tile[1] : tile[0];
            } else {
                showToast('❌ Quân cờ không thể đánh sang trái!');
                return false;
            }
        } else if (forcedDirection === 'right') {
            // Bắt buộc đánh sang phải
            if (tile[0] === right || tile[1] === right) {
                side = 'right';
                isReversed = (tile[0] !== right);
                boardEnds.right = isReversed ? tile[0] : tile[1];
            } else {
                showToast('❌ Quân cờ không thể đánh sang phải!');
                return false;
            }
        } else {
            // Không có hướng bắt buộc - tự động xác định (ưu tiên phải trước)
            if (tile[0] === right || tile[1] === right) {
                side = 'right';
                isReversed = (tile[0] !== right);
                boardEnds.right = isReversed ? tile[0] : tile[1];
            } else if (tile[0] === left || tile[1] === left) {
                side = 'left';
                isReversed = (tile[1] !== left);
                boardEnds.left = isReversed ? tile[1] : tile[0];
            } else {
                showToast('❌ Quân Cờ Không Hợp Lệ');
                return false;
            }
        }

        const hand = hands[playerIdx];
        const idx = hand.findIndex(t => t[0] === tile[0] && t[1] === tile[1]);
        if (idx !== -1) hand.splice(idx, 1);

        playedTiles.push({ tile, player: playerIdx, connectSide: side, isReversed });

        if (hand.length === 0 && !finishedPlayers.includes(playerIdx)) {
            finishedPlayers.push(playerIdx);
            const titles = ['NHẤT 🥇', 'NHÌ 🥈', 'BA 🥉'];
            showToast(`🎉 ${PLAYER_NAMES[playerIdx]} đã hết bài và ĐẠT HẠNG ${titles[finishedPlayers.length - 1]}!`);
        }

        renderAll();

        if (checkBoardLocked()) {
            if (finishedPlayers.length < 3) {
                showToast(`🔒 Bàn cờ bị Triệt hoàn toàn! Tiến hành tính điểm phân định thứ hạng...`);
                setTimeout(() => {
                    endGame(true);
                }, 2000);
                return true;
            }
        }

        if (finishedPlayers.length < 3) {
            moveToNextPlayer();
            if (currentPlayer !== 0 && !gameOver) {
                setTimeout(() => botTurn(), 2000);
            }
        } else {
            endGame(false);
        }
        
        return true;
    }

    function botTurn() {
        if (gameOver || isProcessing || currentPlayer === 0 || finishedPlayers.includes(currentPlayer)) return;
        isProcessing = true;

        const botIdx = currentPlayer;
        const hand = hands[botIdx];
        const validTiles = hand.filter(t => canPlay(t, boardEnds.left, boardEnds.right));

        if (validTiles.length === 0) {
            showToast(`🤖 ${PLAYER_NAMES[botIdx]} bỏ lượt`);
            isProcessing = false;
            
            moveToNextPlayer();
            renderAll();
            
            if (checkBoardLocked()) {
                showToast(`🔒 Bàn cờ bị Triệt! Đang tổng kết...`);
                setTimeout(() => endGame(true), 2000);
                return;
            }

            if (currentPlayer !== 0 && !gameOver) {
                setTimeout(() => botTurn(), 2000);
            }
            return;
        }

        let chosenTile = null;
        if (window.botAI && typeof window.botAI.chooseBestTile === 'function') {
            chosenTile = window.botAI.chooseBestTile(hand, boardEnds.left, boardEnds.right, playedTiles);
        }
        if (!chosenTile) chosenTile = validTiles[0];

        setTimeout(() => {
    playTile(botIdx, chosenTile);
    isProcessing = false;
}, 500);
    }

    // Trong function endGame(), THÊM ĐOẠN NÀY VÀO CUỐI

function endGame(isLocked) {
    gameOver = true;
    hideDirectionChooser();
    let html = '';
    const rankTitles = ['🥇 Nhất', '🥈 Nhì', '🥉 Ba', '4️⃣ Cuối'];
    
    // ===== KHAI BÁO finalRanking Ở ĐẦU HÀM =====
    let finalRanking = [];

    if (isLocked) {
        html += `<h2>🔒 BÀN CỜ BỊ TRIỆT (KHÓA ĐẦU)</h2>`;
        html += `<div style="margin: 8px 0; font-size:12px; color:#ffddaa;">Xếp hạng dựa trên tiến trình về đích và tổng số điểm còn lại:</div>`;

        const remainingPlayers = [];
        for (let i = 0; i < 4; i++) {
            if (!finishedPlayers.includes(i)) {
                const pts = hands[i].reduce((sum, t) => sum + t[0] + t[1], 0);
                remainingPlayers.push({ idx: i, points: pts });
            }
        }
        remainingPlayers.sort((a, b) => a.points - b.points);

        finalRanking = [...finishedPlayers];
        for (let rp of remainingPlayers) {
            finalRanking.push(rp.idx);
        }

        // Đảm bảo có 4 người
        while (finalRanking.length < 4) {
            for (let i = 0; i < 4; i++) {
                if (!finalRanking.includes(i)) {
                    finalRanking.push(i);
                    break;
                }
            }
        }

        for (let i = 0; i < finalRanking.length && i < 4; i++) {
            const pIdx = finalRanking[i];
            const pts = hands[pIdx].reduce((sum, t) => sum + t[0] + t[1], 0);
            const isFinishedBefore = finishedPlayers.includes(pIdx) && (hands[pIdx].length === 0);
            
            const highlight = (i === 0) ? 'style="color: #ffcc00; font-weight: bold; background: #550000;"' : '';
            const note = isFinishedBefore ? ' (Hết bài trước)' : ` (${pts} điểm)`;
            
            html += `<div class="rank" ${highlight}>${rankTitles[i]}: ${PLAYER_NAMES[pIdx]}${note}</div>`;
        }
    } else {
        html += `<h2>🎀 Ván DOMINO 🎀</h2>`;
        html += `<div style="margin: 8px 0; font-size:12px; color:#ffddaa;">Xếp hạng theo thứ tự hết bài tự nhiên:</div>`;

        // Lấy danh sách người đã hết bài
        finalRanking = [...finishedPlayers];
        
        // ===== THÊM NGƯỜI CÒN THIẾU VÀO CUỐI =====
        while (finalRanking.length < 4) {
            for (let i = 0; i < 4; i++) {
                if (!finalRanking.includes(i)) {
                    finalRanking.push(i);
                    break;
                }
            }
        }

        // Hiển thị đủ 4 người
        for (let i = 0; i < finalRanking.length && i < 4; i++) {
            const pIdx = finalRanking[i];
            const highlight = (i === 0) ? 'style="color: #ffcc00; font-weight: bold; background: #550000;"' : '';
            const isFinished = finishedPlayers.includes(pIdx) && hands[pIdx].length === 0;
            const note = isFinished ? ' ⭐' : ` (${hands[pIdx].length} bài còn lại)`;
            html += `<div class="rank" ${highlight}>${rankTitles[i]}: ${PLAYER_NAMES[pIdx]}${note}</div>`;
        }
    }
    
    // ===== CHỈ GỌI 1 LẦN =====
    resultContent.innerHTML = html;
    resultBoard.classList.add('show');
    
    // ===== GỬI KẾT QUẢ XẾP HẠNG SANG HOAHONG.JS =====
    const rankingNames = finalRanking.slice(0, 4).map(idx => PLAYER_NAMES[idx]);
    console.log('🏆 Kết quả xếp hạng (4 người):', rankingNames);
    
    setTimeout(function() {
        if (window.hoahong && typeof window.hoahong.receiveRanking === 'function') {
            console.log('📤 Gửi kết quả cho hoahong.js:', rankingNames);
            window.hoahong.receiveRanking(rankingNames);
        } else {
            console.warn('⚠️ hoahong.js chưa sẵn sàng, thử lại...');
            setTimeout(function() {
                if (window.hoahong && typeof window.hoahong.receiveRanking === 'function') {
                    window.hoahong.receiveRanking(rankingNames);
                }
            }, 1000);
        }
    }, 500);
}


    function renderDots(num) {
        const positions = {
            1: [[1,1]],
            2: [[0,0], [2,2]],
            3: [[0,0], [1,1], [2,2]],
            4: [[0,0], [0,2], [2,0], [2,2]],
            5: [[0,0], [0,2], [1,1], [2,0], [2,2]],
            6: [[0,0], [0,1], [0,2], [2,0], [2,1], [2,2]]
        };
        const pos = positions[num] || [];
        let html = '<div class="dot-grid">';
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const hasDot = pos.some(p => p[0] === r && p[1] === c);
                html += hasDot ? '<div class="dot"></div>' : '<div class="empty-dot"></div>';
            }
        }
        html += '</div>';
        return html;
    }

    function renderBoard() {
    boardArea.innerHTML = '';
    if (playedTiles.length === 0) return;

    let ordered = [];
    let remaining = [...playedTiles];
    ordered.push(remaining.shift());

    let loopLimit = 100;
    while (remaining.length > 0 && loopLimit-- > 0) {
        let found = false;
        for (let i = 0; i < remaining.length; i++) {
            const item = remaining[i];
            if (item.connectSide === 'left') {
                ordered.unshift(item);
                remaining.splice(i, 1);
                found = true;
                break;
            } else if (item.connectSide === 'right') {
                ordered.push(item);
                remaining.splice(i, 1);
                found = true;
                break;
            }
        }
        if (!found) {
            ordered.push(remaining.shift());
        }
    }

    let rootIdx = ordered.findIndex(item => item.tile[0] === 6 && item.tile[1] === 6);
    if (rootIdx === -1) rootIdx = 0;

    const bW = boardArea.clientWidth || 345;
    const bH = boardArea.clientHeight || 340;
    const T_LONG = 44;
    const T_SHORT = 24;

    let geoStates = new Array(ordered.length);
    const rootItem = ordered[rootIdx];
    const rootIsDouble = (rootItem.tile[0] === rootItem.tile[1]);
    
    geoStates[rootIdx] = {
        cx: bW / 2,
        cy: 35, 
        isDouble: rootIsDouble,
        dirLeft: 2,   
        dirRight: 0,  
        angle: rootIsDouble ? 90 : 0, 
        w: rootIsDouble ? T_SHORT : T_LONG,
        h: rootIsDouble ? T_LONG : T_SHORT,
        vOuterLeft: rootItem.tile[0],
        vOuterRight: rootItem.tile[1],
        renderTile: [...rootItem.tile]
    };

    const padX = 26; 
    const padY = 32; 

    // --- NHÁNH PHẢI ---
    for (let i = rootIdx + 1; i < ordered.length; i++) {
        const prev = geoStates[i - 1];
        const item = ordered[i];
        const isDouble = (item.tile[0] === item.tile[1]);

        let currentDir = prev.dirRight;
        let cx = prev.cx;
        let cy = prev.cy;

        let nextIsVertical = isDouble ? (currentDir % 2 === 0) : (currentDir % 2 !== 0);
        let w = nextIsVertical ? T_SHORT : T_LONG;
        let h = nextIsVertical ? T_LONG : T_SHORT;

        let step = (currentDir === 0 || currentDir === 2) ? ((prev.w / 2) + (w / 2)) : ((prev.h / 2) + (h / 2));

        // Xử lý khi chạm mép cho nhánh phải
        if (currentDir === 0 && prev.cx + step > bW - padX) {
            // Đang đi sang phải, chạm mép phải -> rẽ xuống
            currentDir = 1; 
            nextIsVertical = isDouble ? (currentDir % 2 === 0) : (currentDir % 2 !== 0);
            w = nextIsVertical ? T_SHORT : T_LONG;
            h = nextIsVertical ? T_LONG : T_SHORT;
            cx = prev.cx; 
            cy = prev.cy + (prev.h / 2) + (h / 2);
        } 
        else if (currentDir === 1 && prev.cy + step > bH - padY) {
            // Đang đi xuống, chạm mép dưới -> rẽ trái
            currentDir = 2; 
            nextIsVertical = isDouble ? (currentDir % 2 === 0) : (currentDir % 2 !== 0);
            w = nextIsVertical ? T_SHORT : T_LONG;
            h = nextIsVertical ? T_LONG : T_SHORT;
            cx = prev.cx - (prev.w / 2) - (w / 2);
            cy = prev.cy;
        }
        else if (currentDir === 2 && prev.cx - step < padX) {
            // Đang đi trái, chạm mép trái -> rẽ lên (cho nhánh phải)
            currentDir = 3;
            nextIsVertical = isDouble ? (currentDir % 2 === 0) : (currentDir % 2 !== 0);
            w = nextIsVertical ? T_SHORT : T_LONG;
            h = nextIsVertical ? T_LONG : T_SHORT;
            cx = prev.cx;
            cy = prev.cy - (prev.h / 2) - (h / 2);
        }
        else {
            if (currentDir === 0) cx += step;
            else if (currentDir === 1) cy += step;
            else if (currentDir === 2) cx -= step;
            else if (currentDir === 3) cy -= step;
        }

        let matchVal = prev.vOuterRight;
        let renderTile = [];
        let angle = 0;

        if (isDouble) {
            renderTile = [item.tile[0], item.tile[1]];
            angle = (currentDir % 2 === 0) ? 90 : 0;
        } else {
            if (item.tile[0] === matchVal) {
                renderTile = [item.tile[0], item.tile[1]];
            } else {
                renderTile = [item.tile[1], item.tile[0]];
            }
            if (currentDir === 0) angle = 0;
            else if (currentDir === 1) angle = 90;
            else if (currentDir === 2) angle = 180;
            else if (currentDir === 3) angle = 270;
        }

        geoStates[i] = {
            cx, cy, isDouble, w, h,
            dirLeft: (currentDir + 2) % 4,
            dirRight: currentDir,
            angle,
            vOuterRight: isDouble ? matchVal : renderTile[1],
            renderTile
        };
    }

    // --- NHÁNH TRÁI (SỬA LẠI HOÀN TOÀN) ---
    for (let i = rootIdx - 1; i >= 0; i--) {
        const prev = geoStates[i + 1];
        const item = ordered[i];
        const isDouble = (item.tile[0] === item.tile[1]);

        let currentDir = prev.dirLeft;
        let cx = prev.cx;
        let cy = prev.cy;

        let nextIsVertical = isDouble ? (currentDir % 2 === 0) : (currentDir % 2 !== 0);
        let w = nextIsVertical ? T_SHORT : T_LONG;
        let h = nextIsVertical ? T_LONG : T_SHORT;

        let step = (currentDir === 0 || currentDir === 2) ? ((prev.w / 2) + (w / 2)) : ((prev.h / 2) + (h / 2));

        // Xử lý khi chạm mép cho nhánh trái
        if (currentDir === 2 && prev.cx - step < padX) {
            // Đang đi sang trái, chạm mép trái
            // Kiểm tra vị trí để quyết định rẽ lên hay xuống
            if (prev.cy < bH / 2) {
                // Nếu ở trên (top) -> rẽ xuống
                currentDir = 1;
            } else {
                // Nếu ở dưới (bottom) -> rẽ lên
                currentDir = 3;
            }
            nextIsVertical = isDouble ? (currentDir % 2 === 0) : (currentDir % 2 !== 0);
            w = nextIsVertical ? T_SHORT : T_LONG;
            h = nextIsVertical ? T_LONG : T_SHORT;
            cx = prev.cx;
            if (currentDir === 1) {
                cy = prev.cy + (prev.h / 2) + (h / 2); // Đi xuống
            } else {
                cy = prev.cy - (prev.h / 2) - (h / 2); // Đi lên
            }
        } 
        else if (currentDir === 1 && prev.cy + step > bH - padY) {
            // Đang đi xuống, chạm mép dưới -> rẽ phải
            currentDir = 0;
            nextIsVertical = isDouble ? (currentDir % 2 === 0) : (currentDir % 2 !== 0);
            w = nextIsVertical ? T_SHORT : T_LONG;
            h = nextIsVertical ? T_LONG : T_SHORT;
            cx = prev.cx + (prev.w / 2) + (w / 2);
            cy = prev.cy;
        }
        else if (currentDir === 3 && prev.cy - step < padY) {
            // Đang đi lên, chạm mép trên -> rẽ phải
            currentDir = 0;
            nextIsVertical = isDouble ? (currentDir % 2 === 0) : (currentDir % 2 !== 0);
            w = nextIsVertical ? T_SHORT : T_LONG;
            h = nextIsVertical ? T_LONG : T_SHORT;
            cx = prev.cx + (prev.w / 2) + (w / 2);
            cy = prev.cy;
        }
        else {
            if (currentDir === 0) cx += step;
            else if (currentDir === 1) cy += step;
            else if (currentDir === 2) cx -= step;
            else if (currentDir === 3) cy -= step;
        }

        let matchVal = prev.vOuterLeft;
        let renderTile = [];
        let angle = 0;

        if (isDouble) {
            renderTile = [item.tile[0], item.tile[1]];
            angle = (currentDir % 2 === 0) ? 90 : 0;
        } else {
            if (item.tile[1] === matchVal) {
                renderTile = [item.tile[0], item.tile[1]];
            } else {
                renderTile = [item.tile[1], item.tile[0]];
            }
            if (currentDir === 2) angle = 0;
            else if (currentDir === 1) angle = 270;
            else if (currentDir === 0) angle = 180;
            else if (currentDir === 3) angle = 90;
        }

        geoStates[i] = {
            cx, cy, isDouble, w, h,
            dirLeft: currentDir,
            dirRight: (currentDir + 2) % 4,
            angle,
            vOuterLeft: isDouble ? matchVal : renderTile[0],
            renderTile
        };
    }

    // Vẽ các quân cờ
    for (let i = 0; i < ordered.length; i++) {
        const state = geoStates[i];
        const div = document.createElement('div');
        div.className = 'played-tile horizontal';

        const half1 = document.createElement('div');
        half1.className = 'half';
        half1.innerHTML = renderDots(state.renderTile[0]);

        const divider = document.createElement('div');
        divider.className = 'divider';

        const half2 = document.createElement('div');
        half2.className = 'half';
        half2.innerHTML = renderDots(state.renderTile[1]);

        div.appendChild(half1);
        div.appendChild(divider);
        div.appendChild(half2);

        div.style.left = `${state.cx - T_LONG / 2}px`;
        div.style.top = `${state.cy - T_SHORT / 2}px`;
        div.style.transform = `rotate(${state.angle}deg)`;

        boardArea.appendChild(div);
    }
}

    // ===== SỬA HÀM updateMyTiles =====
    function updateMyTiles() {
        myTilesContainer.innerHTML = '';
        const hand = hands[0];
        
        if (finishedPlayers.includes(0)) {
            myTilesContainer.innerHTML = '<div style="color:#ffcc00; font-size:14px; font-weight:bold; width:100%; text-align:center; padding:10px;">🎉 Bạn đã hết bài! Đang đợi các Bot đánh nốt...</div>';
            return;
        }

        for (let i = 0; i < hand.length; i++) {
            const tile = hand[i];
            const div = document.createElement('div');
            div.className = 'my-tile';
            if (i === selectedTileIndex) div.classList.add('selected');
            div.dataset.idx = i;

            const half1 = document.createElement('div');
            half1.className = 'half';
            half1.innerHTML = renderDots(tile[0]);
            const divider = document.createElement('div');
            divider.className = 'divider';
            const half2 = document.createElement('div');
            half2.className = 'half';
            half2.innerHTML = renderDots(tile[1]);

            div.appendChild(half1);
            div.appendChild(divider);
            div.appendChild(half2);

            // ===== SỬA SỰ KIỆN CLICK =====
            div.addEventListener('click', function() {
                if (gameOver || currentPlayer !== 0) return;
                if (isChoosingDirection) return; // Đang chọn hướng thì không làm gì
                
                const idx = parseInt(this.dataset.idx);
                const tileData = hand[idx];
                
                // Kiểm tra quân cờ có hợp lệ không
                const leftVal = boardEnds.left;
                const rightVal = boardEnds.right;
                if (leftVal === null || rightVal === null) {
                    selectedTileIndex = (selectedTileIndex === idx) ? -1 : idx;
                    updateMyTiles();
                    return;
                }
                
                const canPlayTile = tileData[0] === leftVal || tileData[1] === leftVal ||
                                   tileData[0] === rightVal || tileData[1] === rightVal;
                
                if (!canPlayTile) {
                    showToast('❌ Quân cờ không hợp lệ!');
                    selectedTileIndex = -1;
                    updateMyTiles();
                    return;
                }
                
                // Kiểm tra nếu đánh được cả 2 đầu
                const canLeft = tileData[0] === leftVal || tileData[1] === leftVal;
                const canRight = tileData[0] === rightVal || tileData[1] === rightVal;
                
                if (canLeft && canRight) {
                    // Đánh được cả 2 đầu -> hiện hộp chọn
                    selectedTileIndex = idx;
                    updateMyTiles();
                    showDirectionChooser(tileData, idx);
                    return;
                }
                
                // Chỉ đánh được 1 đầu -> chọn bình thường
                selectedTileIndex = (selectedTileIndex === idx) ? -1 : idx;
                updateMyTiles();
            });
            
            myTilesContainer.appendChild(div);
        }
    }

    function updateBotCards() {
        const botIndices = [1, 2, 3];
        const containers = [botWestCards, botNorthCards, botEastCards];
        const counts = [botWestCount, botNorthCount, botEastCount];

        for (let b = 0; b < 3; b++) {
            const botIdx = botIndices[b];
            const hand = hands[botIdx];
            const container = containers[b];
            container.innerHTML = '';
            
            if (finishedPlayers.includes(botIdx)) {
                counts[b].innerHTML = '<span style="color:#00ffcc; font-size:11px;">TỚI 🎉</span>';
                continue;
            }

            const displayCount = Math.min(hand.length, 7);
            for (let i = 0; i < displayCount; i++) {
                const card = document.createElement('div');
                card.className = 'bot-card';
                container.appendChild(card);
            }
            counts[b].textContent = hand.length;
        }
    }

    function renderAll() {
        renderBoard();
        updateMyTiles();
        updateBotCards();
    }

    function showToast(msg) {
        toastText.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    document.getElementById('btnNewGame').addEventListener('click', function() {
    // Gửi sự kiện để hoahong.js biết
    document.dispatchEvent(new CustomEvent('gameReloaded'));
    // Reload trang
    location.reload();
    });

    document.getElementById('btnPlay').addEventListener('click', function() {
        if (gameOver || currentPlayer !== 0 || selectedTileIndex === -1 || finishedPlayers.includes(0)) return;
        if (isChoosingDirection) return;
        
        const tile = hands[0][selectedTileIndex];
        if (tile && playTile(0, tile)) {
            selectedTileIndex = -1;
            // Ẩn hộp chọn nếu đang hiển thị
            hideDirectionChooser();
        }
    });

    document.getElementById('btnPass').addEventListener('click', function() {
        if (gameOver || currentPlayer !== 0 || finishedPlayers.includes(0)) return;
        if (isChoosingDirection) {
            hideDirectionChooser();
            selectedTileIndex = -1;
            renderAll();
            return;
        }
        
        const hasValid = hands[0].some(t => canPlay(t, boardEnds.left, boardEnds.right));
        if (hasValid) {
            showToast('⚠️ Bạn có quân hợp lệ, hãy đánh!');
            return;
        }
        showToast('⏭ Bạn bỏ lượt');
        
        moveToNextPlayer();
        renderAll();
        
        if (checkBoardLocked()) {
            showToast(`🔒 Bàn cờ bị Triệt! Đang tổng kết...`);
            setTimeout(() => endGame(true), 2000);
            return;
        }

        if (currentPlayer !== 0 && !gameOver) setTimeout(() => botTurn(), 2000);
    });

    toastClose.addEventListener('click', () => toast.classList.remove('show'));
    resultClose.addEventListener('click', () => resultBoard.classList.remove('show'));

    // Khởi tạo
    initGame();

    // Expose các hàm cần thiết cho file khác
    window.playTile = playTile;
    window.showDirectionChooser = showDirectionChooser;
    window.hideDirectionChooser = hideDirectionChooser;
    window.playTileWithDirection = playTileWithDirection;
    window.canPlayBothEnds = canPlayBothEnds;
    window.isChoosingDirection = isChoosingDirection;
    window.updateMyTiles = updateMyTiles;
    window.renderAll = renderAll;
    window.showToast = showToast;
    window.hands = hands;
    window.boardEnds = boardEnds;
    window.currentPlayer = currentPlayer;
    window.gameOver = gameOver;
    window.selectedTileIndex = selectedTileIndex;
    window.finishedPlayers = finishedPlayers;
    window.moveToNextPlayer = moveToNextPlayer;

})();

// ===== HÀM GỬI KẾT QUẢ XẾP HẠNG SANG HOAHONG.JS =====
let rankingSent = false; // Biến kiểm tra đã gửi thành công chưa
let sendAttempts = 0; // Số lần thử gửi
const MAX_ATTEMPTS = 10; // Số lần thử tối đa

function sendRankingToHoahong(rankings) {
    if (rankingSent) {
        console.log('✅ Đã gửi thành công, bỏ qua...');
        return;
    }
    
    if (sendAttempts >= MAX_ATTEMPTS) {
        console.log('❌ Đã thử gửi', MAX_ATTEMPTS, 'lần, dừng lại...');
        return;
    }
    
    sendAttempts++;
    console.log(`📤 Lần thử ${sendAttempts}/${MAX_ATTEMPTS}: Gửi kết quả sang hoahong.js...`, rankings);
    
    if (window.hoahong && typeof window.hoahong.receiveRanking === 'function') {
        // Gọi hàm nhận của hoahong.js, nếu trả về true là đã xử lý xong
        const result = window.hoahong.receiveRanking(rankings);
        if (result === true) {
            rankingSent = true;
            console.log('✅ hoahong.js đã nhận và xử lý xong!');
            return;
        } else {
            console.log('⏳ hoahong.js chưa xử lý xong, thử lại...');
            // Thử lại sau 1 giây
            setTimeout(() => sendRankingToHoahong(rankings), 1000);
        }
    } else {
        console.warn('⚠️ hoahong.js chưa sẵn sàng, thử lại sau 1s...');
        setTimeout(() => sendRankingToHoahong(rankings), 1000);
    }
}

// ===== LẤY KẾT QUẢ XẾP HẠNG TỪ BẢNG KẾT QUẢ =====
function getRankingFromResultBoard() {
    console.log('🔍 Đang lấy xếp hạng từ bảng kết quả...');
    
    const resultBoard = document.getElementById('resultBoard');
    if (!resultBoard || !resultBoard.classList.contains('show')) {
        console.log('⏳ Bảng kết quả chưa hiển thị, thử lại sau...');
        setTimeout(getRankingFromResultBoard, 500);
        return;
    }

    const content = document.getElementById('resultContent');
    if (!content) {
        console.log('❌ Không tìm thấy resultContent');
        return;
    }

    const rankElements = content.querySelectorAll('.rank');
    if (rankElements.length === 0) {
        console.log('❌ Không tìm thấy .rank elements');
        return;
    }

    // Lấy tên người chơi theo thứ tự Nhất, Nhì, Ba, Cuối
    const rankings = [];
    const names = ['Tôi', 'Bot Tây', 'Bot Bắc', 'Bot Đông'];
    
    for (let el of rankElements) {
        const text = el.textContent;
        let found = false;
        for (let name of names) {
            if (text.includes(name)) {
                rankings.push(name);
                found = true;
                break;
            }
        }
        // Nếu không tìm thấy tên, thêm placeholder
        if (!found) {
            rankings.push('Unknown');
        }
    }

    console.log('📊 Xếp hạng tìm thấy:', rankings);

    // Bắt đầu gửi ngay, không cần đợi đủ người
    // Vì cuối trận đã có kết quả
    if (rankings.length > 0) {
        // Reset trạng thái gửi
        rankingSent = false;
        sendAttempts = 0;
        // Gửi ngay lập tức
        sendRankingToHoahong(rankings);
    } else {
        console.log('⚠️ Không tìm thấy xếp hạng nào, thử lại...');
        setTimeout(getRankingFromResultBoard, 500);
    }
}

// ===== THEO DÕI KHI BẢNG KẾT QUẢ XUẤT HIỆN =====
function watchForResultBoard() {
    const resultBoard = document.getElementById('resultBoard');
    if (resultBoard && resultBoard.classList.contains('show')) {
        console.log('🎯 Phát hiện bảng kết quả đang hiển thị!');
        // Đợi 300ms để DOM cập nhật xong
        setTimeout(getRankingFromResultBoard, 300);
    } else {
        // Tiếp tục theo dõi
        setTimeout(watchForResultBoard, 500);
    }
}

// Bắt đầu theo dõi ngay khi script load xong
setTimeout(watchForResultBoard, 1000);



// Hàm chuyển lượt thông minh - SỬA
function moveToNextPlayer() {
    if (finishedPlayers.length >= 3) {
        for (let i = 0; i < 4; i++) {
            if (!finishedPlayers.includes(i)) {
                finishedPlayers.push(i);
                break;
            }
        }
        endGame(false);
        return;
    }

    let nextPlayer = (currentPlayer + 1) % 4;
    while (finishedPlayers.includes(nextPlayer)) {
        nextPlayer = (nextPlayer + 1) % 4;
    }
    currentPlayer = nextPlayer;
    
    // ===== CẬP NHẬT window.currentPlayer =====
    window.currentPlayer = currentPlayer;
    console.log('🔄 moveToNextPlayer: currentPlayer =', currentPlayer); // Thêm log
}