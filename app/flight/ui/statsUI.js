// ui/statsUI.js

class StatsUI {
    constructor() {
        this.panel = null;
        this.statValues = {}; // 빠른 수치 갱신용 참조 캐시
    }

    init() {
        this.panel = document.createElement('div');
        this.panel.id = 'stats-panel';
        this.panel.style.position = 'absolute';
        this.panel.style.top = '50%';
        this.panel.style.left = '20px';
        this.panel.style.transform = 'translateY(-50%)'; // 세로 중앙 정렬
        this.panel.style.width = '180px';
        this.panel.style.background = 'rgba(0, 20, 0, 0.4)';
        this.panel.style.border = '1px dashed rgba(0, 255, 0, 0.6)';
        this.panel.style.padding = '10px';
        this.panel.style.color = '#00ff00';
        this.panel.style.fontFamily = "'Courier New', Courier, monospace";
        this.panel.style.fontSize = '12px';
        this.panel.style.zIndex = '50';

        const title = document.createElement('div');
        title.innerText = '[ SHIP SPECS ]';
        title.style.textAlign = 'center';
        title.style.marginBottom = '10px';
        title.style.color = '#aaffaa';
        this.panel.appendChild(title);

        const statList = [
            { key: 'level', label: 'LV' },
            { key: 'xp', label: 'XP' },
            { key: 'hp', label: 'MAX HP' },
            { key: 'speed', label: 'SPEED' },
            { key: 'turnRate', label: 'AGILITY' },
            { key: 'damage', label: 'POWER' },
            { key: 'bulletSpeed', label: 'BLT SPD' },
            { key: 'fireRate', label: 'FIRE RT' },
        ];

        statList.forEach(s => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.marginBottom = '3px';

            const lspan = document.createElement('span');
            lspan.innerText = s.label + ':';
            
            const vspan = document.createElement('span');
            vspan.innerText = '0';
            
            row.appendChild(lspan);
            row.appendChild(vspan);
            this.panel.appendChild(row);

            // 캐시 보관
            this.statValues[s.key] = vspan;
        });

        const hud = document.getElementById('hud-container') || document.body;
        hud.appendChild(this.panel);
    }

    update(playerState) {
        if (!this.panel) return;
        
        // 수치 가공 (눈에 보기 좋게 변환)
        this.statValues['level'].innerText = playerState.level;
        this.statValues['xp'].innerText = `${playerState.xp} / ${playerState.xpToNextLevel}`;
        
        this.statValues['hp'].innerText = Math.floor(playerState.getMaxHp());
        this.statValues['speed'].innerText = playerState.getSpeed().toFixed(0);
        
        // TurnRate는 수치가 너무 작으므로 1000 곱해서 보여주기
        const agi = (playerState.getTurnRate() * 1000).toFixed(0);
        this.statValues['turnRate'].innerText = agi;
        
        this.statValues['damage'].innerText = playerState.getDamage().toFixed(1);
        this.statValues['bulletSpeed'].innerText = playerState.getBulletSpeed().toFixed(0);
        
        // FireRate(연사력) 배율. 높을 수록 빠름
        this.statValues['fireRate'].innerText = (playerState.getFireRate() * 100).toFixed(0) + '%';
    }
}

window.statsUI = new StatsUI();
// 편의를 위한 글로벌 브릿지 방출
window.updateStatsUI = function(pState) {
    if(window.statsUI) window.statsUI.update(pState);
};
