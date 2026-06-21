// blink.js - Hiệu ứng chớp sáng tên người chơi (Chỉ chớp phần chữ, không chớp toàn khung)
(function() {
    let blinkInterval = null;
    let currentBlinkPlayer = -1;
    let isBlinking = false;
    let blinkTimeout = null;

    // Lấy element tên người chơi - CHỈ LẤY PHẦN CHỮ BÊN TRONG
    function getPlayerNameElement(playerIdx) {
        // Đối với người chơi (Tôi), lấy span bên trong
        if (playerIdx === 0) {
            return document.getElementById('playerName0');
        }
        
        // Đối với bot, lấy bot-name
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

    // Tạo hiệu ứng chớp sáng - CHỈ THAY ĐỔI MÀU SẮC
    function startBlink(playerIdx) {
        stopBlink();

        if (playerIdx < 0 || playerIdx > 3) return;
        if (window.gameOver) return;
        if (window.finishedPlayers && window.finishedPlayers.includes(playerIdx)) return;

        const el = getPlayerNameElement(playerIdx);
        if (!el) return;

        currentBlinkPlayer = playerIdx;
        isBlinking = true;

        // Lưu style gốc
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
                // TRẠNG THÁI SÁNG
                el.style.backgroundColor = '#ffffff';
                el.style.color = '#000000';
                el.style.textShadow = '0 0 20px #ffffff, 0 0 40px #ffdd44';
                el.style.outline = '3px solid #ffdd44';
                el.style.outlineOffset = '2px';
                el.style.borderRadius = '6px';
                el.style.padding = '2px 8px';
            } else {
                // TRẠNG THÁI TỐI
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

        // Khôi phục style cho tất cả
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
                // Xóa outline và các style thêm vào
                el.style.outline = '';
                el.style.outlineOffset = '';
                el.style.borderRadius = '';
                el.style.padding = '';
            }
        }

        currentBlinkPlayer = -1;
        isBlinking = false;
    }

    // Lấy currentPlayer từ game
    function getCurrentPlayer() {
        if (window.currentPlayer !== undefined && window.currentPlayer !== null) {
            return window.currentPlayer;
        }
        return -1;
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

    // ===== THEO DÕI BẰNG CÁCH HOOK VÀO moveToNextPlayer =====
    function hookGameFunctions() {
        if (typeof window.moveToNextPlayer === 'function') {
            const originalMoveToNext = window.moveToNextPlayer;
            window.moveToNextPlayer = function() {
                const result = originalMoveToNext.apply(this, arguments);
                setTimeout(() => {
                    const player = getCurrentPlayer();
                    if (player >= 0 && !window.gameOver) {
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
                        updateBlink(player);
                    }
                }, 400);
                return result;
            };
        }
    }

    // ===== THEO DÕI BẰNG CÁCH QUÉT DOM =====
    function startDOMWatcher() {
        let lastPlayer = -1;
        
        setInterval(() => {
            if (window.gameOver) {
                if (isBlinking) {
                    stopBlink();
                }
                return;
            }

            const currentPlayer = getCurrentPlayer();
            
            if (currentPlayer !== lastPlayer && currentPlayer >= 0) {
                lastPlayer = currentPlayer;
                
                if (window.finishedPlayers && window.finishedPlayers.includes(currentPlayer)) {
                    if (isBlinking) {
                        stopBlink();
                    }
                    return;
                }

                updateBlink(currentPlayer);
            }
        }, 500);
    }

    // ===== KHỞI TẠO =====
    function init() {
        // Lưu style gốc cho tất cả người chơi
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

        setTimeout(() => {
            hookGameFunctions();
        }, 600);

        setTimeout(() => {
            startDOMWatcher();
        }, 800);

        setTimeout(() => {
            const player = getCurrentPlayer();
            if (player >= 0 && !window.gameOver) {
                updateBlink(player);
            }
        }, 1000);

        window.blinkManager = {
            start: startBlink,
            stop: stopBlink,
            update: updateBlink,
            getCurrent: getCurrentPlayer
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }

    console.log('✅ Blink.js đã được tải thành công!');
})();