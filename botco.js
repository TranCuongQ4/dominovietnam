// botco.js
(function() {
    window.botAI = {
        chooseBestTile: function(hand, left, right, playedTiles) {
            const valid = hand.filter(t => {
                return t[0] === left || t[1] === left || t[0] === right || t[1] === right;
            });
            if (valid.length === 0) return null;

            // Chiến thuật 1: Giữ điểm thấp
            let minSum = Infinity;
            let best = valid[0];
            for (let t of valid) {
                const sum = t[0] + t[1];
                if (sum < minSum) {
                    minSum = sum;
                    best = t;
                }
            }

            // Chiến thuật 2: Ưu tiên quân bò cao (5:5, 6:6)
            for (let t of valid) {
                if (t[0] === t[1] && t[0] >= 4) {
                    return t;
                }
            }

            // Chiến thuật 3: Chọn quân xuất hiện nhiều trên bàn
            const freq = {};
            for (let item of playedTiles) {
                const [a, b] = item.tile;
                freq[a] = (freq[a] || 0) + 1;
                freq[b] = (freq[b] || 0) + 1;
            }
            let maxFreq = -1;
            let bestFreq = best;
            for (let t of valid) {
                const f = (freq[t[0]] || 0) + (freq[t[1]] || 0);
                if (f > maxFreq) {
                    maxFreq = f;
                    bestFreq = t;
                }
            }

            // Kết hợp chiến thuật
            if (bestFreq && best) {
                const diff = Math.abs((best[0] + best[1]) - (bestFreq[0] + bestFreq[1]));
                if (diff <= 2) return bestFreq;
            }
            return best;
        }
    };
    console.log('🤖 Bot AI đã sẵn sàng');
})();