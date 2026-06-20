// quanly.js - Quản lý âm thanh nền
(function() {
    let audioContext = null;
    let audioBuffer = null;
    let sourceNode = null;
    let gainNode = null;
    let isMusicPlaying = false;
    let musicStarted = false;

    // Hàm khởi tạo AudioContext (cần tương tác người dùng để bắt đầu)
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    // Tải file nhạc
    async function loadMusic() {
        try {
            const response = await fetch('domino.mp3');
            if (!response.ok) {
                console.warn('Không tìm thấy file domino.mp3');
                return false;
            }
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return true;
        } catch (error) {
            console.warn('Lỗi tải nhạc:', error);
            return false;
        }
    }

    // Phát nhạc loop
    function playMusic() {
        if (!audioBuffer || !audioContext) return;
        
        // Dừng nhạc cũ nếu đang chạy
        if (sourceNode) {
            try {
                sourceNode.stop();
            } catch(e) {}
            sourceNode = null;
        }

        // Tạo gain node để điều chỉnh volume
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.15; // Volume nhỏ 15%
        gainNode.connect(audioContext.destination);

        // Tạo nguồn phát
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.loop = true; // Loop vô hạn
        sourceNode.connect(gainNode);
        sourceNode.start(0);
        isMusicPlaying = true;
        musicStarted = true;
        console.log('🎵 Nhạc nền đang phát (volume 15%)');
    }

    // Dừng nhạc
    function stopMusic() {
        if (sourceNode) {
            try {
                sourceNode.stop();
            } catch(e) {}
            sourceNode = null;
        }
        isMusicPlaying = false;
        console.log('🔇 Nhạc nền đã dừng');
    }

    // Toggle nhạc (bật/tắt)
    function toggleMusic() {
        if (!audioContext) {
            initAudio();
            if (!audioContext) return;
        }
        
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        if (isMusicPlaying) {
            stopMusic();
        } else {
            if (!musicStarted) {
                // Lần đầu phát
                loadMusic().then(success => {
                    if (success) playMusic();
                });
            } else {
                playMusic();
            }
        }
    }

    // Bắt đầu nhạc khi có tương tác (click)
    function startMusicOnInteraction() {
        if (musicStarted) return;
        
        if (!audioContext) {
            initAudio();
        }
        
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        if (!musicStarted) {
            loadMusic().then(success => {
                if (success) playMusic();
            });
        }
    }

    // ====== EXPOSE GLOBAL ======
    window.musicManager = {
        play: playMusic,
        stop: stopMusic,
        toggle: toggleMusic,
        isPlaying: () => isMusicPlaying,
        startOnInteraction: startMusicOnInteraction
    };

    // Thêm nút điều khiển nhạc vào giao diện
    function addMusicControl() {
        // Chờ DOM load
        const checkExist = setInterval(() => {
            const actions = document.querySelector('.actions');
            if (!actions) return;

            clearInterval(checkExist);

            const musicBtn = document.createElement('button');
            musicBtn.id = 'btnMusic';
            musicBtn.textContent = '🎵 Nhạc';
            musicBtn.style.cssText = `
                background: #2a3f4a;
                border: 1px solid #3a5060;
                border-radius: 20px;
                padding: 6px 12px;
                font-weight: 700;
                font-size: 12px;
                color: #eef;
                cursor: pointer;
                flex: 1;
            `;
            
            musicBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleMusic();
                this.textContent = isMusicPlaying ? '🔊 Nhạc' : '🎵 Nhạc';
            });

            // Chèn vào sau nút Ván Mới
            const newGameBtn = document.getElementById('btnNewGame');
            if (newGameBtn) {
                newGameBtn.parentNode.insertBefore(musicBtn, newGameBtn.nextSibling);
            } else {
                actions.appendChild(musicBtn);
            }
        }, 100);
    }

    // Lắng nghe sự kiện click để bắt đầu nhạc
    document.addEventListener('click', function firstClick() {
        startMusicOnInteraction();
        document.removeEventListener('click', firstClick);
    }, { once: true });

    // Khởi tạo
    function init() {
        addMusicControl();
        console.log('🎮 Quanly.js đã sẵn sàng!');
        console.log('📌 Nhấn vào bất kỳ đâu để bắt đầu nhạc nền');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Quanly.js đã được tải thành công!');
})();