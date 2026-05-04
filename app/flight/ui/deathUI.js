// ui/deathUI.js

function initDeathUI() {
    const layer = document.createElement('div');
    layer.id = 'death-layer';
    layer.style.position = 'absolute';
    layer.style.top = '0';
    layer.style.left = '0';
    layer.style.width = '100vw';
    layer.style.height = '100vh';
    layer.style.backgroundColor = 'rgba(50, 0, 0, 0.85)'; // 붉은 핏빛 배경
    layer.style.display = 'none'; // 평소엔 숨김
    layer.style.flexDirection = 'column';
    layer.style.justifyContent = 'center';
    layer.style.alignItems = 'center';
    layer.style.zIndex = '500'; 
    layer.style.fontFamily = "'Courier New', Courier, monospace";

    const title = document.createElement('h1');
    title.innerText = 'YOU DIED';
    title.style.color = '#ff0000';
    title.style.textShadow = '0 0 20px #ff0000';
    title.style.fontSize = '80px';
    title.style.margin = '0 0 20px 0';

    const scoreDiv = document.createElement('h2');
    scoreDiv.id = 'death-score';
    scoreDiv.innerText = 'Final Score: 0 XP (Lv.1)';
    scoreDiv.style.color = '#ffffff';
    scoreDiv.style.fontSize = '32px';
    scoreDiv.style.marginBottom = '50px';

    const rBtn = document.createElement('button');
    rBtn.innerText = 'BACK TO LOBBY';
    rBtn.style.padding = '15px 30px';
    rBtn.style.fontSize = '24px';
    rBtn.style.cursor = 'pointer';
    rBtn.style.background = '#ff0000';
    rBtn.style.color = '#000';
    rBtn.style.fontWeight = 'bold';
    rBtn.style.border = 'none';
    rBtn.style.transition = 'all 0.2s';
    
    // 호버 효과
    rBtn.onmouseenter = () => { rBtn.style.background = '#ffffff'; rBtn.style.boxShadow = '0 0 15px #ff0000'; };
    rBtn.onmouseleave = () => { rBtn.style.background = '#ff0000'; rBtn.style.boxShadow = 'none'; };

    rBtn.onclick = () => {
        window.gameStateManager.showLobby();
    };

    layer.appendChild(title);
    layer.appendChild(scoreDiv);
    layer.appendChild(rBtn);
    
    document.body.appendChild(layer);
}

window.initDeathUI = initDeathUI;
