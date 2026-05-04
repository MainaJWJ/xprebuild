// ui/upgradeUI.js

class UpgradeUI {
    constructor() {
        this.container = null;
    }

    init() {
        this.container = document.createElement('div');
        this.container.id = 'upgrade-container';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '120px'; // 고도계/로더계 위쪽 중앙
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.display = 'none'; // 평소엔 숨김
        this.container.style.flexDirection = 'row';
        this.container.style.gap = '10px';
        this.container.style.zIndex = '500';
        
        const hud = document.getElementById('hud-container') || document.body;
        hud.appendChild(this.container);
    }

    // 팝업 트리거
    show() {
        if (!this.container) return;
        
        let pts = window.playerState ? window.playerState.upgradePoints : 0;
        if (pts <= 0) {
            this.container.style.display = 'none';
            return;
        }

        // 포인트가 있으면 표시
        this.container.style.display = 'flex';
        this.container.innerHTML = ''; // 버튼 재생성

        const title = document.createElement('div');
        title.innerText = `LEVEL UP! (Points: ${pts})`;
        title.style.position = 'absolute';
        title.style.top = '-30px';
        title.style.left = '50%';
        title.style.transform = 'translateX(-50%)';
        title.style.color = '#ffff00';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '18px';
        title.style.textShadow = '0 0 5px #ffff00';
        title.style.whiteSpace = 'nowrap';
        this.container.appendChild(title);

        const upOptions = [
            { key: 'hp', name: '+ MAX HP', color: '#ff5555' },
            { key: 'speed', name: '+ SPEED', color: '#55ffff' },
            { key: 'turnRate', name: '+ AGILITY', color: '#55ff55' },
            { key: 'damage', name: '+ POWER', color: '#ff55ff' },
            { key: 'bulletSpeed', name: '+ BLT SPD', color: '#ffff55' },
            { key: 'fireRate', name: '+ FIRE RT', color: '#ffffff' }
        ];

        upOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt.name;
            btn.style.padding = '10px';
            btn.style.background = 'rgba(0, 0, 0, 0.7)';
            btn.style.border = `2px solid ${opt.color}`;
            btn.style.color = opt.color;
            btn.style.cursor = 'pointer';
            btn.style.fontWeight = 'bold';
            btn.style.transition = '0.2s';
            
            btn.onmouseenter = () => { btn.style.background = opt.color; btn.style.color = '#000'; };
            btn.onmouseleave = () => { btn.style.background = 'rgba(0,0,0,0.7)'; btn.style.color = opt.color; };

            btn.onclick = () => {
                let success = window.playerState.upgradeStat(opt.key);
                if (success) {
                    // 포인트 소진 후 남은 포인트에 따라 재렌더링 혹은 닫기
                    this.show(); 
                }
            };
            this.container.appendChild(btn);
        });
    }
}

window.upgradeUI = new UpgradeUI();

// 글로벌 호출 방출
window.showUpgradeUI = function() {
    if(window.upgradeUI) window.upgradeUI.show();
};
