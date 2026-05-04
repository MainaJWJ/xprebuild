// ui/lobbyUI.js

function initLobbyUI() {
    const layer = document.createElement('div');
    layer.id = 'lobby-layer';
    layer.style.position = 'absolute';
    layer.style.top = '0';
    layer.style.left = '0';
    layer.style.width = '100vw';
    layer.style.height = '100vh';
    layer.style.backgroundColor = 'rgba(0, 20, 0, 0.8)'; // 어두운 녹색 배경
    layer.style.display = 'flex';
    layer.style.flexDirection = 'column';
    layer.style.justifyContent = 'center';
    layer.style.alignItems = 'center';
    layer.style.zIndex = '500'; // 게임오버(Death)보다는 낮게, 게임뷰(HUD)보다는 높게
    layer.style.fontFamily = "'Courier New', Courier, monospace";

    const title = document.createElement('h1');
    title.innerText = 'SPACE COMBAT .IO';
    title.style.color = '#00ff00';
    title.style.textShadow = '0 0 10px #00ff00';
    title.style.fontSize = '48px';
    title.style.marginBottom = '40px';

    const inputWrap = document.createElement('div');
    inputWrap.style.display = 'flex';
    inputWrap.style.flexDirection = 'column';
    inputWrap.style.gap = '10px';

    const paramInput = document.createElement('input');
    paramInput.type = 'text';
    paramInput.id = 'lobby-nickname';
    paramInput.placeholder = 'Enter Nickname';
    paramInput.maxLength = 15;
    paramInput.style.padding = '10px 15px';
    paramInput.style.fontSize = '24px';
    paramInput.style.background = 'rgba(0, 0, 0, 0.5)';
    paramInput.style.border = '2px solid #00ff00';
    paramInput.style.color = '#00ff00';
    paramInput.style.textAlign = 'center';
    paramInput.style.outline = 'none';

    const sBtn = document.createElement('button');
    sBtn.innerText = 'START GAME';
    sBtn.style.padding = '15px 30px';
    sBtn.style.fontSize = '24px';
    sBtn.style.cursor = 'pointer';
    sBtn.style.background = '#00ff00';
    sBtn.style.color = '#000';
    sBtn.style.fontWeight = 'bold';
    sBtn.style.border = 'none';
    sBtn.style.transition = 'all 0.2s';
    
    // 호버 효과
    sBtn.onmouseenter = () => { sBtn.style.background = '#ffffff'; sBtn.style.boxShadow = '0 0 15px #00ff00'; };
    sBtn.onmouseleave = () => { sBtn.style.background = '#00ff00'; sBtn.style.boxShadow = 'none'; };

    // 시작 로직
    sBtn.onclick = () => {
        const nickname = paramInput.value.trim() || 'Guest_' + Math.floor(Math.random()*1000);
        window.gameStateManager.startGame(nickname);
    };

    // 엔터키 지원
    paramInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sBtn.onclick();
    });

    inputWrap.appendChild(paramInput);
    inputWrap.appendChild(sBtn);
    
    layer.appendChild(title);
    layer.appendChild(inputWrap);
    
    document.body.appendChild(layer);
}

// 스크립트 로드 시 즉시 실행될 수 있게 할지, index.html에서 호출할지 결정. 여기서는 수동 호출 구조.
window.initLobbyUI = initLobbyUI;
