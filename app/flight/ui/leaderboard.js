// ui/leaderboard.js

class LeaderboardUI {
    constructor() {
        this.board = null;
        this.listContainer = null;
    }

    init() {
        this.board = document.createElement('div');
        this.board.id = 'leaderboard';
        this.board.style.position = 'absolute';
        this.board.style.top = '20px';
        this.board.style.right = '20px';
        this.board.style.width = '200px';
        this.board.style.background = 'rgba(0, 40, 0, 0.6)';
        this.board.style.border = '2px solid #00ff00';
        this.board.style.padding = '10px';
        this.board.style.color = '#00ff00';
        this.board.style.fontFamily = "'Courier New', Courier, monospace";
        this.board.style.zIndex = '50'; // HUD 보다 높게
        
        const title = document.createElement('div');
        title.innerText = '★ TOP 10 PILOTS ★';
        title.style.textAlign = 'center';
        title.style.fontWeight = 'bold';
        title.style.borderBottom = '1px solid #00ff00';
        title.style.paddingBottom = '5px';
        title.style.marginBottom = '10px';
        
        this.listContainer = document.createElement('div');
        this.listContainer.style.display = 'flex';
        this.listContainer.style.flexDirection = 'column';
        this.listContainer.style.gap = '5px';

        this.board.appendChild(title);
        this.board.appendChild(this.listContainer);
        
        // HUD 컨테이너에 부착 (로비에서 같이 숨기기 위함)
        const hud = document.getElementById('hud-container') || document.body;
        hud.appendChild(this.board);
    }

    // 랭킹 업데이트
    update(playersData) {
        // playersData: [{name: 'Alpha', xp: 500}, {name: 'Player', xp: 1200}, ...]
        if (!this.listContainer) return;
        
        // 내림차순 정렬 및 상위 10개 커트
        const top10 = playersData.sort((a, b) => b.xp - a.xp).slice(0, 10);
        
        this.listContainer.innerHTML = ''; // 초기화 후 다시 쓰기
        
        top10.forEach((p, idx) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.fontSize = '12px';
            
            // 본인 하이라이팅
            if (p.isMe) {
                row.style.color = '#ffff00';
                row.style.fontWeight = 'bold';
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.innerText = `${idx + 1}. ${p.name}`;
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.maxWidth = '120px';

            const xpSpan = document.createElement('span');
            xpSpan.innerText = `${p.xp}`;
            
            row.appendChild(nameSpan);
            row.appendChild(xpSpan);
            this.listContainer.appendChild(row);
        });
    }
}

window.leaderboardUI = new LeaderboardUI();
