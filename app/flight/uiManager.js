// uiManager.js

let hudContainer, coordinatesElement;

function initUIManager() {
    // 1. 전체 HUD 감싸는 레이어
    hudContainer = document.createElement('div');
    hudContainer.id = 'hud-container';
    
    const gameLayer = document.getElementById('game-layer') || document.body;
    gameLayer.appendChild(hudContainer);

    // 2. 좌표계 표시기
    coordinatesElement = document.createElement('div');
    coordinatesElement.id = 'coordinates';
    coordinatesElement.style.position = 'absolute';
    coordinatesElement.style.top = '20px'; // 자세계가 사라졌으므로 위쪽으로 배치
    coordinatesElement.style.left = '20px';
    gameLayer.appendChild(coordinatesElement);
}

function updateHUD(spaceship) {
    if (!spaceship || !spaceship.mesh) return;

    // A. 좌표 갱신
    if (coordinatesElement) {
        coordinatesElement.textContent =
            `X: ${spaceship.mesh.position.x.toFixed(0)}, Y: ${spaceship.mesh.position.y.toFixed(0)}, Z: ${spaceship.mesh.position.z.toFixed(0)}`;
    }
}

window.initUIManager = initUIManager;
window.updateHUD = updateHUD;