// uiManager.js

let hudContainer, ammoContainer, pitchLadder, coordinatesElement;

// 무기의 초기 최대 탄약 숫자를 기억해둘 Map (퍼센트 연산용)
let maxAmmoMap = new Map();

function initUIManager() {
    // 1. 전체 HUD 감싸는 레이어
    hudContainer = document.createElement('div');
    hudContainer.id = 'hud-container';
    
    // game-layer 아래 종속시켜서 Lobby 화면 시 통째로 투명해지게 만들기
    const gameLayer = document.getElementById('game-layer') || document.body;
    gameLayer.appendChild(hudContainer);

    // 구형 좌측 하단 좌표계 부활
    coordinatesElement = document.createElement('div');
    coordinatesElement.id = 'coordinates';
    // 레이더 아래쪽에 배치하기 위해 CSS 약간 수정 (uiManager에서 인라인으로 조작)
    coordinatesElement.style.bottom = 'auto';
    coordinatesElement.style.top = '240px'; // 레이더(200px + 여백) 바로 아래
    coordinatesElement.style.left = '20px';
    
    // 좌표 텍스트도 game-layer 종속
    gameLayer.appendChild(coordinatesElement);

    // 2. 조준점 (Crosshair)
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    const crosshairCircle = document.createElement('div');
    crosshairCircle.className = 'crosshair-circle';
    crosshair.appendChild(crosshairCircle);
    hudContainer.appendChild(crosshair);

    // 3. 탄창 게이지 틀 (Ammo Bar)
    ammoContainer = document.createElement('div');
    ammoContainer.id = 'ammo-container';
    hudContainer.appendChild(ammoContainer);

    // 4. 자세계 (Attitude Indicator)
    const attitudeContainer = document.createElement('div');
    attitudeContainer.id = 'attitude-container';

    // 고정된 비행기 심볼
    const fixedShip = document.createElement('div');
    fixedShip.id = 'attitude-fixed-ship';
    attitudeContainer.appendChild(fixedShip);

    // 회전하고 이동할 사다리 눈금 배경
    pitchLadder = document.createElement('div');
    pitchLadder.id = 'attitude-pitch-ladder';

    // 수평선 중앙
    const horizon = document.createElement('div');
    horizon.className = 'horizon-line';
    pitchLadder.appendChild(horizon);

    // 위아래 Пи치 눈금 그리기 (예: -90도부터 +90도까지 15도 단위 위아래로)
    const pxPerDegree = 3;  // 1도당 이동할 픽셀 비율 (조정하여 감도 조절)
    for (let dg = -90; dg <= 90; dg += 15) {
        if (dg === 0) continue;
        const pLine = document.createElement('div');
        pLine.className = 'pitch-line ' + (dg > 0 ? 'positive' : 'negative');
        // 중앙 기준으로 위(+) 아래(-)로 떨어뜨림. 
        // 주의: 화면 좌표계는 위가 -Y이므로 양수 각도가 화면 위로 올라가려면 top이 작아져야 함.
        pLine.style.top = `calc(50% - ${dg * pxPerDegree}px)`;
        pLine.innerText = Math.abs(dg);
        pitchLadder.appendChild(pLine);
    }

    attitudeContainer.appendChild(pitchLadder);
    hudContainer.appendChild(attitudeContainer);
}

function updateHUD(spaceship) {
    if (!spaceship) return;

    // A. 탄창 게이지 동적 렌더링 및 업데이트
    if (spaceship.weapons && spaceship.weapons.length > 0) {
        // 첫 무기 로드 시 구조 그려주기
        if (ammoContainer.children.length === 0) {
            spaceship.weapons.forEach(w => {
                // 원형 객체로부터 최대 장탄수 확보
                maxAmmoMap.set(w.key, w.data.performance.ammo);

                const slot = document.createElement('div');
                slot.className = 'ammo-slot';
                slot.id = 'ammo-' + w.key;

                const label = document.createElement('span');
                label.innerText = `[${w.key.toUpperCase()}]`;

                const barBg = document.createElement('div');
                barBg.className = 'ammo-bar-bg';

                const barFill = document.createElement('div');
                barFill.className = 'ammo-bar-fill';
                barFill.id = 'ammo-fill-' + w.key;

                barBg.appendChild(barFill);
                slot.appendChild(label);
                slot.appendChild(barBg);

                ammoContainer.appendChild(slot);
            });
        }

        // 실시간 게이지 깎기
        spaceship.weapons.forEach(w => {
            const fillEle = document.getElementById('ammo-fill-' + w.key);
            if (fillEle) {
                const max = maxAmmoMap.get(w.key) || 1;
                const ratio = Math.max(0, w.currentAmmo / max);
                fillEle.style.width = (ratio * 100) + '%';
                // 붉은색 경고 (탄환 20% 이하)
                if (ratio < 0.2) {
                    fillEle.style.background = '#ff0000';
                    fillEle.style.boxShadow = '0 0 5px #ff0000';
                } else {
                    fillEle.style.background = 'rgba(0, 255, 0, 0.9)';
                    fillEle.style.boxShadow = '0 0 5px #00ff00';
                }
            }
        });
    }

    // B. 자세계 (Attitude Indicator) 실제 기체 기울기 반영
    if (pitchLadder && spaceship.mesh) {
        const rollDeg = THREE.MathUtils.radToDeg(spaceship.rollAngle);
        const pitchDeg = THREE.MathUtils.radToDeg(spaceship.pitchAngle);
        const pxPerDegree = 3;
        const translateY = pitchDeg * pxPerDegree;
        pitchLadder.style.transform = `translate(-50%, -50%) rotate(${-rollDeg}deg) translateY(${translateY}px)`;
    }

    // C. 텍스트 좌표 갱신 부활
    if (coordinatesElement && spaceship.mesh) {
        coordinatesElement.textContent =
            `X: ${spaceship.mesh.position.x.toFixed(0)}, Y: ${spaceship.mesh.position.y.toFixed(0)}, Z: ${spaceship.mesh.position.z.toFixed(0)}`;
    }
}

// 호환성용 유지
function updateCoordinates(position) {
    if (coordinatesElement && position && coordinatesElement.style.display !== 'none') {
        if (window.spaceship && window.spaceship.frozen) return;
        coordinatesElement.textContent =
            `X: ${position.x.toFixed(0)}, Y: ${position.y.toFixed(0)}, Z: ${position.z.toFixed(0)}`;
    }
}

window.initUIManager = initUIManager;
window.updateCoordinates = updateCoordinates;
window.updateHUD = updateHUD;