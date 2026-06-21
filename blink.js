// blink.js - Hiệu ứng chớp sáng tên người chơi (Lấy currentPlayer trực tiếp)
(function() {
    let blinkInterval = null;
    let currentBlinkPlayer = -1;
    let isBlinking = false;
    let blinkTimeout = null;
    let lastPlayer = -1;
    let watcherInterval = null;

    // Lấy element tên người chơi
    function getPlayerNameElement(playerIdx) {
        if (playerIdx === 0) {
            return document.getElementById('playerName0');
        }
        
        const selectors = [
            null,
            '#botWest .bot-name',
            '#botNorth .bot-name',
            '#botEast .bot-name'
        ];
        return document.querySelector(selectors[playerIdx]);
    }

    // Lưu style gốc
    const originalStyles = {};

    // Tạo hiệu ứng chớp sáng
    function startBlink(playerIdx) {
        stopBlink();

        if (playerIdx < 0 || playerIdx > 3) return;
        if (window.gameOver) return;
        if (window.finishedPlayers && window.finishedPlayers.includes(playerIdx)) return;

        const el = getPlayerNameElement(playerIdx);
        if (!el) return;

        currentBlinkPlayer = playerIdx;
        isBlinking = true;

        if (!originalStyles[playerIdx]) {
            originalStyles[playerIdx] = {
                backgroundColor: el.style.backgroundColor || '',
                color: el.style.color || '',
                textShadow: el.style.textShadow || '',
            };
        }

        let isOn = false;

        blinkInterval = setInterval(() => {
            if (!el || !isBlinking) {
                stopBlink();
                return;
            }

            const currentPlayer = getCurrentPlayer();
            if (currentPlayer !== currentBlinkPlayer) {
                stopBlink();
                return;
            }

            isOn = !isOn;

            if (isOn) {
                el.style.backgroundColor = '#ffffff';
                el.style.color = '#000000';
                el.style.textShadow = '0 0 20px #ffffff, 0 0 40px #ffdd44';
                el.style.outline = '3px solid #ffdd44';
                el.style.outlineOffset = '2px';
                el.style.borderRadius = '6px';
                el.style.padding = '2px 8px';
            } else {
                el.style.backgroundColor = '#cc2200';
                el.style.color = '#ffffff';
                el.style.textShadow = '0 0 15px #ff4400, 0 0 30px #ff2200';
                el.style.outline = '3px solid #ff4400';
                el.style.outlineOffset = '2px';
                el.style.borderRadius = '6px';
                el.style.padding = '2px 8px';
            }
            
        }, 400);

        if (blinkTimeout) {
            clearTimeout(blinkTimeout);
        }
        blinkTimeout = setTimeout(() => {
            stopBlink();
        }, 30000);
    }

    // Dừng hiệu ứng chớp
    function stopBlink() {
        if (blinkInterval) {
            clearInterval(blinkInterval);
            blinkInterval = null;
        }

        if (blinkTimeout) {
            clearTimeout(blinkTimeout);
            blinkTimeout = null;
        }

        for (let i = 0; i < 4; i++) {
            const el = getPlayerNameElement(i);
            if (el) {
                if (originalStyles[i]) {
                    el.style.backgroundColor = originalStyles[i].backgroundColor || '';
                    el.style.color = originalStyles[i].color || '';
                    el.style.textShadow = originalStyles[i].textShadow || '';
                } else {
                    el.style.backgroundColor = '';
                    el.style.color = '';
                    el.style.textShadow = '';
                }
                el.style.outline = '';
                el.style.outlineOffset = '';
                el.style.borderRadius = '';
                el.style.padding = '';
            }
        }

        currentBlinkPlayer = -1;
        isBlinking = false;
    }

    // ===== LẤY CURRENTPLAYER TRỰC TIẾP TỪ GAME =====
    function getCurrentPlayer() {
        // Thử lấy từ window.currentPlayer
        if (window.currentPlayer !== undefined && window.currentPlayer !== null) {
            return window.currentPlayer;
        }
        
        // Nếu không, thử kiểm tra bằng cách nào khác
        // Kiểm tra xem có quân cờ nào đang được chọn không
        const selectedTile = document.querySelector('.my-tile.selected');
        if (selectedTile) {
            // Nếu có quân cờ được chọn, có thể là lượt của người chơi
            return 0;
        }
        
        return -1;
    }

    // ===== LẤY CURRENTPLAYER TỪ BẢNG KẾT QUẢ =====
    function getPlayerFromResultBoard() {
        const resultBoard = document.getElementById('resultBoard');
        if (!resultBoard || !resultBoard.classList.contains('show')) {
            return null;
        }
        
        const content = document.getElementById('resultContent');
        if (!content) return null;
        
        const rankElements = content.querySelectorAll('.rank');
        if (rankElements.length === 0) return null;
        
        const names = ['Tôi', 'Bot Tây', 'Bot Bắc', 'Bot Đông'];
        for (let el of rankElements) {
            const text = el.textContent;
            if (text.includes('Nhất') || text.includes('🥇')) {
                for (let name of names) {
                    if (text.includes(name)) {
                        return names.indexOf(name);
                    }
                }
            }
        }
        return null;
    }

    // Cập nhật blink
    function updateBlink(playerIdx) {
        if (window.gameOver) {
            stopBlink();
            return;
        }

        if (window.finishedPlayers && window.finishedPlayers.includes(playerIdx)) {
            stopBlink();
            return;
        }

        startBlink(playerIdx);
    }

    // ===== RESET KHI BẮT ĐẦU VÁN MỚI =====
    function resetForNewGame() {
        stopBlink();
        lastPlayer = -1;
        
        if (watcherInterval) {
            clearInterval(watcherInterval);
            watcherInterval = null;
        }
        
        console.log('🔄 Reset blink cho ván mới');
        
        setTimeout(() => {
            const player = getCurrentPlayer();
            if (player >= 0 && !window.gameOver) {
                console.log('🎯 Cập nhật blink cho người chơi:', player);
                lastPlayer = player;
                updateBlink(player);
            }
            startDOMWatcher();
        }, 500);
    }

    // ===== THEO DÕI BẰNG CÁCH HOOK VÀO moveToNextPlayer =====
    function hookGameFunctions() {
        if (typeof window.moveToNextPlayer === 'function') {
            const originalMoveToNext = window.moveToNextPlayer;
            window.moveToNextPlayer = function() {
                const result = originalMoveToNext.apply(this, arguments);
                setTimeout(() => {
                    const player = getCurrentPlayer();
                    if (player >= 0 && !window.gameOver) {
                        console.log('🔄 Chuyển lượt đến:', player);
                        updateBlink(player);
                    }
                }, 300);
                return result;
            };
        }

        if (typeof window.playTile === 'function') {
            const originalPlayTile = window.playTile;
            window.playTile = function(playerIdx, tile) {
                const result = originalPlayTile.apply(this, arguments);
                setTimeout(() => {
                    const player = getCurrentPlayer();
                    if (player >= 0 && !window.gameOver) {
                        console.log('🎯 Sau khi đánh, lượt:', player);
                        updateBlink(player);
                    }
                }, 400);
                return result;
            };
        }
    }

    // ===== THEO DÕI BẰNG CÁCH QUÉT DOM =====
    function startDOMWatcher() {
        if (watcherInterval) {
            clearInterval(watcherInterval);
            watcherInterval = null;
        }
        
        console.log('👀 Bắt đầu DOM watcher');
        
        watcherInterval = setInterval(() => {
            if (window.gameOver) {
                if (isBlinking) {
                    stopBlink();
                }
                return;
            }

            const currentPlayer = getCurrentPlayer();
            
            if (currentPlayer !== lastPlayer && currentPlayer >= 0) {
                console.log('👀 Phát hiện thay đổi:', lastPlayer, '->', currentPlayer);
                lastPlayer = currentPlayer;
                
                if (window.finishedPlayers && window.finishedPlayers.includes(currentPlayer)) {
                    if (isBlinking) {
                        stopBlink();
                    }
                    return;
                }

                updateBlink(currentPlayer);
            }
        }, 300); // Kiểm tra nhanh hơn
    }

    // ===== KHỞI TẠO =====
    function init() {
        console.log('💡 Khởi tạo Blink.js...');
        
        // Lưu style gốc
        for (let i = 0; i < 4; i++) {
            const el = getPlayerNameElement(i);
            if (el && !originalStyles[i]) {
                originalStyles[i] = {
                    backgroundColor: el.style.backgroundColor || '',
                    color: el.style.color || '',
                    textShadow: el.style.textShadow || '',
                };
            }
        }

        // Theo dõi nút "Ván Mới"
        const btnNewGame = document.getElementById('btnNewGame');
        if (btnNewGame) {
            btnNewGame.addEventListener('click', function() {
                console.log('🔄 Click Ván Mới');
                setTimeout(() => {
                    resetForNewGame();
                }, 600);
            });
        }

        // Theo dõi đóng bảng kết quả
        const resultClose = document.getElementById('resultClose');
        if (resultClose) {
            resultClose.addEventListener('click', function() {
                setTimeout(() => {
                    const player = getCurrentPlayer();
                    if (player >= 0 && !window.gameOver) {
                        console.log('📋 Đóng bảng kết quả, cập nhật:', player);
                        lastPlayer = player;
                        updateBlink(player);
                    }
                }, 300);
            });
        }

        setTimeout(() => {
            hookGameFunctions();
        }, 600);

        setTimeout(() => {
            startDOMWatcher();
        }, 800);

        setTimeout(() => {
            const player = getCurrentPlayer();
            if (player >= 0 && !window.gameOver) {
                console.log('🎯 Lượt ban đầu:', player);
                lastPlayer = player;
                updateBlink(player);
            }
        }, 1000);

        window.blinkManager = {
            start: startBlink,
            stop: stopBlink,
            update: updateBlink,
            getCurrent: getCurrentPlayer,
            reset: resetForNewGame
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }

    console.log('✅ Blink.js đã được tải thành công!');
})();