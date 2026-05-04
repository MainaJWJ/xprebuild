// myShipControl.js

/**
 * Space Shuttle Controller
 * 
 * 기능:
 * - space shuttle 3D 모델 로드 (GLB)
 * - 키보드를 통한 기체 조종 (방향키: 피치/요, 스페이스바: 부스트)
 * - JSON 설정 파일 로드 및 적용 (성능, 카메라 거리, 모델 크기 등)
 * - 기체 애니메이션 업데이트
 * 
 * 의존성:
 * - Three.js (r128)
 * - GLTFLoader
 * 
 * 사용법:
 * 1. HTML에서 Three.js 및 GLTFLoader를 먼저 로드해야 합니다.
 * 2. 이 스크립트를 로드합니다.
 * 3. `initMyShipControl(scene, camera)` 함수를 호출합니다.
 *    - `scene`: Three.js Scene 객체
 *    - `camera`: Three.js Camera 객체
 */

// 전역 변수
let spaceship = {
    mesh: null,        // 로드된 3D 모델 그룹
    model: null,       // 로드된 3D 모델 (gltf.scene)
    mixer: null,       // 애니메이션 믹서
    config: null,      // 로드된 설정 (JSON)
    // 조종 관련 상태
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    keys: {},
    frozen: false,      // 정지 상태 플래그 추가
    scene: null,        // Scene 참조 (투사체 생성용)
    hp: 100,            // 플레이어 실시간 체력
    defense: 50
};

// 무기 및 투사체 관련 변수
let equippedWeapons = [];
let activeProjectiles = [];
let activeTrails = []; // 엔진 트레일용 파티클 배열

// playerScale 변수 추가
let playerScale = 1.0;

// 카메라 줌 관련 변수
let cameraZoom = 1.0;  // 줌 레벨 (1.0 = 기본, < 1.0 = 확대, > 1.0 = 축소)
const CAMERA_ZOOM_SENSITIVITY = 0.1;  // 줌 감도

// 기본 설정 (JSON 로드 실패 시 사용)
const DEFAULT_CONFIG = {
    "model": {
        "file": "model/space shuttle/space shuttle.glb",
        "scale": 5,
        "initialRotation": { "x": 0, "y": 90, "z": 0 }
    },
    "performance": {
        "speed": 40,
        "acceleration": 50,
        "turnSensitivity": 0.025,
        "pitchLimits": { "up": 80, "down": -60 },
        "maxRollAngle": 24
    },
    "camera": {
        "follow": {
            "x": -50,
            "y": 20,
            "z": 0
        },
        "rear_view": {
            "x": 200,
            "y": 50,
            "z": 0
        }
    }
};

// 설정 로드
async function loadSpaceshipConfig() {
    try {
        // setting.json 파일 로드
        const settingsResponse = await fetch('./setting.json');
        if (!settingsResponse.ok) {
            throw new Error(`HTTP error! status: ${settingsResponse.status} for setting.json`);
        }
        const settings = await settingsResponse.json();
        playerScale = settings.playerScale || 1.0;
        console.log('Settings loaded:', settings);

        const response = await fetch('./model/space shuttle/space shuttle.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        console.log('Spaceship config loaded:', config);
        return config;
    } catch (error) {
        console.error('Failed to load spaceship config, using default values.', error);
        return DEFAULT_CONFIG;
    }
}

// 3D 모델 로드
function loadSpaceshipModel(scene, onModelLoaded) {
    const loader = new THREE.GLTFLoader();
    
    // 모델 파일 경로 (설정에서 가져오거나 기본값 사용)
    const modelPath = (spaceship.config && spaceship.config.model.file) ? 
                      spaceship.config.model.file : 
                      DEFAULT_CONFIG.model.file;

    loader.load(
        modelPath,
        (gltf) => {
            console.log('Spaceship model loaded successfully.');
            
            // 모델 및 애니메이션 설정
            spaceship.model = gltf.scene;
            
            // 애니메이션이 있는 경우 믹서 생성
            if (gltf.animations && gltf.animations.length > 0) {
                spaceship.mixer = new THREE.AnimationMixer(spaceship.model);
                gltf.animations.forEach((clip) => {
                    spaceship.mixer.clipAction(clip).play();
                });
            }

            // 모델 크기 조정 (설정에서 가져오거나 기본값 사용) - playerScale 적용
            const scale = ((spaceship.config && spaceship.config.model.scale !== undefined) ? 
                          spaceship.config.model.scale : 
                          DEFAULT_CONFIG.model.scale) * playerScale;
            spaceship.model.scale.set(scale, scale, scale);

            // 초기 회전 설정 (설정에서 가져오거나 기본값 사용)
            const initialRotation = (spaceship.config && spaceship.config.model.initialRotation) ? 
                                    spaceship.config.model.initialRotation : 
                                    DEFAULT_CONFIG.model.initialRotation;
            if (initialRotation) {
                spaceship.model.rotation.set(
                    THREE.MathUtils.degToRad(initialRotation.x),
                    THREE.MathUtils.degToRad(initialRotation.y),
                    THREE.MathUtils.degToRad(initialRotation.z)
                );
            }

            // 모델의 그림자 설정
            spaceship.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // 모델을 그룹에 추가하여 위치 및 조작을 용이하게 함
            const modelGroup = new THREE.Group();
            modelGroup.add(spaceship.model);
            // 초기 위치 설정 (블랙홀 근처에 배치)
            modelGroup.position.set(0, 50, 200); // 블랙홀에서 약간 떨어진 위치
            
            spaceship.mesh = modelGroup;
            // scene.add(spaceship.mesh); <-- 로비에서는 즉시 소환하지 않음 (spawnSpaceship에서 호출)
            
            if (onModelLoaded) onModelLoaded();
        },
        (xhr) => {
            console.log('Spaceship model ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('An error happened while loading the spaceship model:', error);
        }
    );
}

// 키보드 이벤트 리스너 설정
function setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
        spaceship.keys[event.key] = true;
        
        // T 키를 누르면 정지 상태 토글
        if (event.key === 't' || event.key === 'T') {
            spaceship.frozen = !spaceship.frozen;
        }
    }, false);

    document.addEventListener('keyup', (event) => {
        spaceship.keys[event.key] = false;
    }, false);
    
    // 마우스 휠 이벤트 리스너 추가
    document.addEventListener('wheel', (event) => {
        // 줌 레벨 조정 (휠 위로 굴리면 확대, 아래로 굴리면 축소)
        cameraZoom += event.deltaY * CAMERA_ZOOM_SENSITIVITY * 0.01;
        // 줌 레벨 제한 (0.01배 ~ 100배)
        cameraZoom = Math.max(0.01, Math.min(cameraZoom, 100));
    }, false);
}

// 기체 업데이트 (조종 및 물리) - simulator/control.js 방식 적용
function updateSpaceship(deltaTime, camera, cameraMode = 'follow') {
    if (!spaceship.mesh || !spaceship.config) return;
    
    // 설정 가져오기 (성능 부분)
    const config = spaceship.config.performance || DEFAULT_CONFIG.performance;
    
    // .io 스탯 연동: playerState가 활성화되어 있으면 해당 값을 가져옴
    var pitchSpeed = window.playerState ? window.playerState.getTurnRate() : config.turnSensitivity;
    var turnSpeed = window.playerState ? window.playerState.getTurnRate() : config.turnSensitivity;
    
    const maxPitchUp = THREE.MathUtils.degToRad(config.pitchLimits.up);
    const maxPitchDown = THREE.MathUtils.degToRad(config.pitchLimits.down);

    // --- simulator/control.js의 updatePlane 함수에서 가져온 로직 ---
    // Pitch (up/down) control with custom limits
    if (spaceship.keys["ArrowDown"]) { // Pitch Up
        spaceship.pitchAngle = Math.min(maxPitchUp, spaceship.pitchAngle + pitchSpeed);
    }
    if (spaceship.keys["ArrowUp"]) { // Pitch Down
        spaceship.pitchAngle = Math.max(maxPitchDown, spaceship.pitchAngle - pitchSpeed);
    }

    // Yaw (left/right) control
    if (spaceship.keys["ArrowLeft"]) spaceship.yawAngle += turnSpeed;
    if (spaceship.keys["ArrowRight"]) spaceship.yawAngle -= turnSpeed;

    let targetRollAngle = 0;
    const maxRoll = THREE.MathUtils.degToRad(config.maxRollAngle);
    if (spaceship.keys["ArrowLeft"]) targetRollAngle = -maxRoll;
    else if (spaceship.keys["ArrowRight"]) targetRollAngle = maxRoll;
    spaceship.rollAngle += (targetRollAngle - spaceship.rollAngle) * 0.1;

    var yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
    var pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spaceship.pitchAngle);
    var rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), spaceship.rollAngle);
    spaceship.mesh.quaternion.copy(yawQ).multiply(pitchQ).multiply(rollQ);

    // 정지 상태가 아닐 때만 위치 이동
    if (!spaceship.frozen) {
        var currentSpeed = window.playerState ? window.playerState.getSpeed() : config.speed;
        if (spaceship.keys[" "]) currentSpeed *= config.acceleration;

        // 로직은 +X 축을 정면으로 사용합니다.
        var forwardVector = new THREE.Vector3(1, 0, 0);
        forwardVector.applyQuaternion(spaceship.mesh.quaternion);
        spaceship.mesh.position.add(forwardVector.multiplyScalar(currentSpeed * deltaTime));
        
        // 무기 발사 체크
        const currentTime = performance.now() / 1000;
        equippedWeapons.forEach(weap => {
            if (spaceship.keys[weap.key] || spaceship.keys[weap.key.toUpperCase()]) {
                 if(window.fireWeaponSystem) {
                     window.fireWeaponSystem(weap, spaceship.mesh, true); // true = isPlayer
                 }
            }
        });

        // 엔진 트레일 스폰 (하드포인트 원리, 선형 리본 방식)
        const engineVisuals = spaceship.config.visuals || { engineHardpoints: [{x: -40, y: 0, z: 0}], trailColor: "0x00ffff" };
        let isBoosting = spaceship.keys[" "];
        
        let trailSizeNormal = (engineVisuals.trailSize && engineVisuals.trailSize.normal !== undefined) ? engineVisuals.trailSize.normal : 2;
        let trailSizeBoost = (engineVisuals.trailSize && engineVisuals.trailSize.boost !== undefined) ? engineVisuals.trailSize.boost : 4;
        
        if (!spaceship.lastHardpointPos) spaceship.lastHardpointPos = [];
        
        let trailColorStr = engineVisuals.trailColor;
        if(trailColorStr.startsWith('#')) trailColorStr = '0x' + trailColorStr.substring(1);
        
        engineVisuals.engineHardpoints.forEach((hp, index) => {
            const localPos = new THREE.Vector3(hp.x, hp.y, hp.z);
            localPos.applyMatrix4(spaceship.mesh.matrixWorld);
            
            if (spaceship.lastHardpointPos[index]) {
                const prevPos = spaceship.lastHardpointPos[index];
                const dist = prevPos.distanceTo(localPos);
                
                // 프레임당 거리가 벌어졌을 때만 연속된 원통(면) 생성
                if (dist > 0.01) {
                    let size = isBoosting ? trailSizeBoost : trailSizeNormal;
                    
                    // 시작점(과거)은 얇게, 끝점(현재)은 원래 두께인 원통으로 연결하여 부드러운 꼬리 연출
                    const geom = new THREE.CylinderGeometry(size * 0.4, size, dist, 5, 1, false);
                    geom.rotateX(Math.PI / 2); // 원통의 Y축을 Z축으로 눕힘
                    geom.translate(0, 0, -dist / 2); // 기준점을 Z축 한쪽 끝으로 밀어 넣음
                    
                    const mat = new THREE.MeshBasicMaterial({ 
                        color: isBoosting ? 0xffaaaa : parseInt(trailColorStr),
                        transparent: true,
                        opacity: isBoosting ? 0.9 : 0.6
                    });
                    const mesh = new THREE.Mesh(geom, mat);
                    
                    // 과거 지점에서 현재 지점을 바라보게 하므로 연속된 띠를 형성
                    mesh.position.copy(prevPos);
                    mesh.lookAt(localPos);
                    
                    spaceship.scene.add(mesh);
                    activeTrails.push({
                        mesh: mesh,
                        age: 0,
                        lifespan: isBoosting ? 0.35 : 0.15,
                        originalSize: size
                    });
                }
            }
            spaceship.lastHardpointPos[index] = localPos.clone();
        });
    }

    // 투사체 이동 및 소멸 처리는 정지 여부와 상관없이 게임 엔진으로서 돕니다 (단독 스코프 유지)
    // index.html 에서 명시적으로 밖에서 돌릴 예정이므로 여기서는 주석 처리 또는 제거합니다.
    // 기존에 있던 updateProjectiles(deltaTime); 호출 위치는 옮겨집니다.

    // 카메라 업데이트
    updateSpaceshipCamera(camera, cameraMode);
}

// 카메라 업데이트
function updateSpaceshipCamera(camera, mode = 'follow') {
    if (!spaceship.mesh) return;

    // 카메라 설정 가져오기
    let cameraSettings;
    if (spaceship.config && spaceship.config.camera) {
        cameraSettings = spaceship.config.camera[mode];
    }
    if (!cameraSettings) {
        // 설정이 없거나 모드가 잘못된 경우 기본값 사용
        cameraSettings = DEFAULT_CONFIG.camera[mode] || DEFAULT_CONFIG.camera.follow;
    }

    // 카메라 오프셋 계산 - playerScale과 cameraZoom 적용
    const offsetX = cameraSettings.x * playerScale * cameraZoom;
    const offsetY = cameraSettings.y * playerScale * cameraZoom;
    const offsetZ = cameraSettings.z * playerScale * cameraZoom;
    
    const relativeCameraOffset = new THREE.Vector3(offsetX, offsetY, offsetZ);
    
    // 기체의 월드 행렬을 사용하여 카메라 위치 계산
    const cameraOffset = relativeCameraOffset.applyMatrix4(spaceship.mesh.matrixWorld);
    
    // 카메라가 바라보는 지점 설정
    let lookAtTarget;
    if (mode === 'follow') {
        // 추적 시점: 기체 앞을 바라봄
        lookAtTarget = new THREE.Vector3(1, 0, 0)
            .applyQuaternion(spaceship.mesh.quaternion)
            .multiplyScalar(50)
            .add(spaceship.mesh.position);
    } else {
        // 후방 시점: 기체 뒤를 바라봄
        lookAtTarget = new THREE.Vector3(-1, 0, 0)
            .applyQuaternion(spaceship.mesh.quaternion)
            .multiplyScalar(50)
            .add(spaceship.mesh.position);
    }

    // 카메라 위치를 부드럽게 이동 (lerp)
    camera.position.lerp(cameraOffset, 0.1);
    
    // 업 벡터 설정 및 시선 방향 조정
    camera.up.set(0, 1, 0);
    camera.lookAt(lookAtTarget);
}

// 애니메이션 업데이트
function updateSpaceshipAnimation(deltaTime) {
    if (spaceship.mixer) {
        spaceship.mixer.update(deltaTime);
    }
}

// --- 피격 횟수(Hit Count) 카운터 UI ---
window.totalHitsTaken = 0;
let hitCounterDiv = null;

window.updateHitCounter = function() {
    window.totalHitsTaken++;
    
    // 최초 피격 시 UI 요소 생성
    if (!hitCounterDiv) {
        hitCounterDiv = document.createElement('div');
        hitCounterDiv.style.position = 'absolute';
        hitCounterDiv.style.top = '150px';
        hitCounterDiv.style.right = '30px';
        hitCounterDiv.style.color = '#ff3333';
        hitCounterDiv.style.fontWeight = '900';
        hitCounterDiv.style.fontSize = '40px';
        hitCounterDiv.style.fontFamily = 'Arial, sans-serif';
        hitCounterDiv.style.textShadow = '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0px 0px 15px red';
        hitCounterDiv.style.pointerEvents = 'none';
        hitCounterDiv.style.zIndex = '999999';
        hitCounterDiv.style.transition = 'transform 0.05s ease-out';
        
        // 최상위 컨테이너에 삽입
        let container = document.getElementById('game-layer') || document.body;
        container.appendChild(hitCounterDiv);
    }
    
    hitCounterDiv.innerText = `총 피격: ${window.totalHitsTaken} Hit!`;
    
    // 맞을 때마다 쿵쾅거리는 바운스 효과
    hitCounterDiv.style.transform = 'scale(1.3) rotate(-3deg)';
    setTimeout(() => {
        if (hitCounterDiv) hitCounterDiv.style.transform = 'scale(1) rotate(0deg)';
    }, 50);
};

// 무기 로드 함수
async function loadEquippedWeapons() {
    if (!spaceship.config || !spaceship.config.combat || !spaceship.config.combat.weapons) return;
    
    equippedWeapons = [];
    for (let w of spaceship.config.combat.weapons) {
        try {
            const resp = await fetch('./' + w.weaponFile);
            if(resp.ok) {
                const weaponData = await resp.json();
                equippedWeapons.push({
                    key: w.key.toLowerCase(),
                    hardpoints: w.hardpoints,
                    data: weaponData,
                    lastFired: 0,
                    currentAmmo: weaponData.performance.ammo
                });
                console.log(`Weapon loaded: ${weaponData.name}`);
            }
        } catch(e) {
            console.error("Failed to load weapon: " + w.weaponFile, e);
        }
    }
    
    // UI에서 읽을 수 있도록 참조 연결
    spaceship.weapons = equippedWeapons;
}

// 범용 무기 발사 로직 (플레이어/적군 공용)
window.fireWeaponSystem = function(weaponState, sourceGroup, isPlayer) {
    if (!spaceship.scene) return;
    
    const currentTime = performance.now() / 1000;
    
    // 쿨타임(연사력) 체크
    let baseFireRate = weaponState.data.performance.fireRate;
    if (isPlayer && window.playerState) {
        // 연사력 배수만큼 쿨타임(간격)을 짧게 함 (1.05배 빠른 발사 = delay를 1.05로 나눔)
        baseFireRate /= window.playerState.stats.fireRate.multi;
    }
    
    if (currentTime - weaponState.lastFired < baseFireRate) return;
    
    // 장탄수 체크
    if (weaponState.currentAmmo === 0) return;
    
    weaponState.lastFired = currentTime;
    if (weaponState.currentAmmo > 0) weaponState.currentAmmo--;

    const visuals = weaponState.data.visuals || {};
    let colorStr = visuals.color || "#ffffff";
    if(colorStr.startsWith('#')) colorStr = '0x' + colorStr.substring(1);
    
    // 기본 크기 배율
    const size = visuals.size || 1.5;
    
    // 상세 크기 설정 (JSON에서 명시하면 적용, 아니면 기존처럼 size 기반 비율 사용)
    const radius = visuals.radius !== undefined ? visuals.radius : size * 0.6;
    const length = visuals.length !== undefined ? visuals.length : size * 4;
    const width = visuals.width !== undefined ? visuals.width : size * 1.5;
    const height = visuals.height !== undefined ? visuals.height : size * 1.5;
    const tube = visuals.tube !== undefined ? visuals.tube : size * 0.3;
    const radiusTop = visuals.radiusTop !== undefined ? visuals.radiusTop : size * 0.1;
    const radiusBottom = visuals.radiusBottom !== undefined ? visuals.radiusBottom : size * 0.8;
    
    // 파일명이나 종류로 무기 특성 파악 (기본 fallback용)
    const wFile = (weaponState.weaponFile || "").toLowerCase();
    const isMissile = wFile.includes('missile');
    const isPlasma = wFile.includes('plasma');
    
    // JSON의 geometry 속성 읽기
    let geomType = visuals.geometry;
    if (geomType) geomType = geomType.toLowerCase();
    
    // 하드포인트(발사구)마다 투사체 생성
    weaponState.hardpoints.forEach(hp => {
        let geometry;
        if (geomType === 'cone' || (!geomType && isMissile)) {
            // 파라미터: 밑면 반지름, 높이(길이), 세그먼트 수
            geometry = new THREE.ConeGeometry(radius, length, 8);
            geometry.rotateZ(-Math.PI / 2); 
        } else if (geomType === 'sphere' || (!geomType && isPlasma)) {
            geometry = new THREE.SphereGeometry(visuals.radius !== undefined ? visuals.radius : size, 8, 8);
        } else if (geomType === 'box') {
            // X가 정면이므로 length(X축), height(Y축), width(Z축)
            geometry = new THREE.BoxGeometry(length, height, width); 
        } else if (geomType === 'torus') {
            geometry = new THREE.TorusGeometry(visuals.radius !== undefined ? visuals.radius : size, tube, 8, 16); 
            geometry.rotateY(Math.PI / 2); 
        } else if (geomType === 'tetrahedron') {
            geometry = new THREE.TetrahedronGeometry(visuals.radius !== undefined ? visuals.radius : size * 1.5); 
        } else {
            // 레이저(cylinder) 기본
            geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 8);
            geometry.rotateZ(-Math.PI / 2);
        }

        const material = new THREE.MeshBasicMaterial({ 
            color: parseInt(colorStr)
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // 기체의 현재 행렬 변환을 로컬 하드포인트에 적용하여 투사체 시작 위치 결정
        const localPos = new THREE.Vector3(hp.x, hp.y, hp.z);
        localPos.applyMatrix4(sourceGroup.matrixWorld);
        mesh.position.copy(localPos);
        
        // 투사체 방향을 기체와 똑같이 회전! (모양이 구체가 아니므로 중요함)
        mesh.quaternion.copy(sourceGroup.quaternion);
        
        // 방향 계산 (+X가 정면)
        const forwardVector = new THREE.Vector3(1, 0, 0);
        forwardVector.applyQuaternion(sourceGroup.quaternion);
        
        // 탄퍼짐(Spread) 구현
        let spread = weaponState.data.performance.spread || 0;
        if (spread > 0) {
            const spreadOffset = new THREE.Vector3(
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread
            );
            const baseForward = forwardVector.clone();
            forwardVector.add(spreadOffset).normalize();
            
            // 시각적 회전도 탄퍼짐 방향에 맞게 기울여줌
            const spreadQuat = new THREE.Quaternion().setFromUnitVectors(baseForward, forwardVector);
            mesh.quaternion.premultiply(spreadQuat);
        }
        
        // .io 공격 스탯 연동
        let projSpeed = weaponState.data.performance.speed;
        let perfDamage = weaponState.data.performance.damage;
        let projDamage = perfDamage !== undefined ? perfDamage : 10;
        
        if (isPlayer && window.playerState) {
            // 무기의 고유성에 플레이어의 스탯 배율을 곱해서 증폭시킴
            projSpeed *= window.playerState.stats.bulletSpeed.multi;
            projDamage = window.playerState.getDamage(); // 플레이어 공격력 스탯을 그대로 적용
        }

        spaceship.scene.add(mesh);
        
        activeProjectiles.push({
            mesh: mesh,
            velocity: forwardVector.multiplyScalar(projSpeed),
            lifespan: weaponState.data.performance.lifespan,
            fadeTime: weaponState.data.performance.fadeTime,
            damage: projDamage,
            isPlayerBullet: isPlayer,
            size: size,
            isMissile: isMissile,
            age: 0
        });
    });
}

// 투사체 업데이트 (비행, 충돌 및 자연 소멸)
function updateProjectiles(deltaTime) {
    if (!spaceship.scene) return;
    
    // 글로벌 천체 매니저에서 적(더미) 타겟 목록 가져오기
    let enemyTargets = [];
    if (window.celestialBodyManager && window.celestialBodyManager.bodies) {
        enemyTargets = window.celestialBodyManager.bodies.filter(b => b.type === 'enemy' && b.group);
    }
    
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        let p = activeProjectiles[i];
        p.age += deltaTime;
        
        // 미사일 연기 궤적 (Trail) 처리
        if (p.isMissile) {
            p.trailTimer = (p.trailTimer || 0) + deltaTime;
            if (p.trailTimer > 0.05) { // 0.05초 간격으로 배기 연기 생성
                p.trailTimer = 0;
                const trailGeom = new THREE.SphereGeometry(p.size * 0.4, 4, 4);
                const trailMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.6 });
                const trailMesh = new THREE.Mesh(trailGeom, trailMat);
                
                // 미사일 꼬리 부분에서 연기 배출
                const backVec = p.velocity.clone().normalize().multiplyScalar(-p.size * 2);
                trailMesh.position.copy(p.mesh.position).add(backVec);
                
                spaceship.scene.add(trailMesh);
                activeTrails.push({
                    mesh: trailMesh,
                    age: 0,
                    lifespan: 0.6, // 연기 생명주기
                    originalSize: p.size * 0.4,
                    isSmoke: true
                });
            }
        }
        
        // 이동
        p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
        
        let hit = false;
        
        // 적군의 총알이면 플레이어를 때리고, 플레이어 총알이면 적군을 때림
        let targets = [];
        
        if (p.isPlayerBullet) {
            targets = enemyTargets;
        } else if (window.gameStateManager && window.gameStateManager.currentState === 'PLAYING') {
            // 살아있을 때만 내 기체가 피격 대상이 됨
            let playerHp = window.playerState ? window.playerState.currentHp : spaceship.hp;
            targets.push({ 
                name: "Player", 
                group: spaceship.mesh, 
                model: spaceship.model, 
                hp: playerHp, 
                defense: spaceship.defense, 
                hitboxRadius: 30, // 플레이어 피격 반경 지정
                isPlayer: true 
            });
        }
        
        for (let t = 0; t < targets.length; t++) {
            let target = targets[t];
            
            // 처음 피격 시 상태 초기화 (적군일 때만)
            if (!target.isPlayer && target.hp === undefined) {
                target.hp = (target.config && target.config.combat) ? target.config.combat.health : 100;
                target.defense = (target.config && target.config.combat) ? target.config.combat.defense : 0;
                target.hitboxRadius = (target.config && target.config.combat && target.config.combat.hitboxRadius) ? target.config.combat.hitboxRadius : 40;
            }
            
            let dist = p.mesh.position.distanceTo(target.group.position);
            // 투사체의 크기 + 타겟의 반경
            let projRadius = p.mesh.geometry.parameters.radius || 1.5;
            
            if (dist <= target.hitboxRadius + projRadius) {
                hit = true;
                
                // 데미지 계산 및 체력 차감 (0 데미지도 유효하게 처리)
                let damageInflicted = p.damage !== undefined ? p.damage : (p.mesh.userData.damage !== undefined ? p.mesh.userData.damage : 10);
                let netDamage = Math.max(0, damageInflicted - (target.defense / 10)); // 최소 데미지를 0으로 허용
                
                if (target.isPlayer) {
                    if (window.playerState) {
                        window.playerState.currentHp -= netDamage;
                        target.hp = window.playerState.currentHp;
                        if (window.updateStatsUI) window.updateStatsUI(window.playerState);
                    } else {
                        spaceship.hp -= netDamage;
                        target.hp = spaceship.hp;
                    }
                    console.log(`%c[경고!] 내 기체가 피격당함! ${netDamage.toFixed(1)} 피해! (내 잔여 HP: ${target.hp.toFixed(1)})`, 'color: #ff5555; background: #333; font-weight: bold;');
                    
                    // 화면에 맞은 횟수 카운터 띄우기
                    if (window.updateHitCounter) window.updateHitCounter();

                    // 플레이어 피격 화면 효과
                    spaceship.model.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if(!child.userData.originalColor) child.userData.originalColor = child.material.color.clone();
                            child.material.color.setHex(0xffaaaa); 
                            setTimeout(() => { if(target.hp > 0 && child.material) child.material.color.copy(child.userData.originalColor); }, 150);
                        }
                    });
                    
                    if (target.hp <= 0 && !spaceship.frozen) {
                        console.log(`%c[GAME OVER] 플레이어가 파괴되었습니다!!!`, 'font-size: 20px; color: red; font-weight: bold;');
                        // 게임 오버 UI 및 라이프사이클 락
                        if (window.gameStateManager) window.gameStateManager.playerDied();
                        else spaceship.frozen = true;
                    }
                } else {
                    target.hp -= netDamage;
                    console.log(`%c[명중!] ${target.name}에게 ${netDamage.toFixed(1)} 데미지! (잔여 HP: ${target.hp.toFixed(1)})`, 'color: orange; font-weight: bold;');
                    
                    // 피격 시각 효과 (빨간 점멸)
                    target.model.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if(!child.userData.originalColor) {
                                child.userData.originalColor = child.material.color.clone();
                            }
                            child.material.color.setHex(0xff0000); 
                            setTimeout(() => {
                                if(target.hp > 0 && child.material) {
                                    child.material.color.copy(child.userData.originalColor);
                                }
                            }, 100);
                        }
                    });
                    
                    // 파괴 판정
                    if (target.hp <= 0) {
                        console.log(`%c[격추!] ${target.name} 파괴됨!`, 'color: red; font-size: 16px; font-weight: bold;');
                        spaceship.scene.remove(target.group);
                        
                        const indexToRemove = window.celestialBodyManager.bodies.indexOf(target);
                        if (indexToRemove > -1) {
                            window.celestialBodyManager.bodies.splice(indexToRemove, 1);
                        }
                        
                        // XP 보상 처리
                        if (p.isPlayerBullet && window.playerState) {
                            let xpReward = (target.config && target.config.combat && target.config.combat.xpReward) ? target.config.combat.xpReward : 60;
                            window.playerState.addXp(xpReward);
                        }
                    }
                }
                break; // 투사체 하나당 1번만 타격
            }
        }
        
        // 명중한 투사체는 즉시 소멸
        if (hit) {
            spaceship.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            activeProjectiles.splice(i, 1);
            continue;
        }
        
        // 수명(Lifespan) 및 점진적 소멸(FadeTime) 처리
        if (p.age >= p.lifespan) {
            let fadeProgress = p.age - p.lifespan;
            if (fadeProgress >= p.fadeTime) {
                // 완전 소멸
                spaceship.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                activeProjectiles.splice(i, 1);
            } else {
                // 서서히 투명해지기 (fade out)
                if (!p.mesh.material.transparent) {
                    p.mesh.material.transparent = true;
                }
                p.mesh.material.opacity = 1.0 - (fadeProgress / p.fadeTime);
            }
        }
    }
}

// 초기화 함수
async function initMyShipControl(scene, camera) {
    console.log("Initializing Spaceship Controller...");
    spaceship.scene = scene;
    
    // 1. 설정 로드
    spaceship.config = await loadSpaceshipConfig();
    
    // 체력 및 방어력 적용
    if (spaceship.config && spaceship.config.combat) {
        spaceship.hp = spaceship.config.combat.health || 100;
        spaceship.defense = spaceship.config.combat.defense || 50;
    }

    
    // 추가: 기체 무기 로드
    await loadEquippedWeapons();
    
    // 2. 모델 로드
    loadSpaceshipModel(scene, () => {
        console.log("Spaceship model is ready.");
        // 3. 키보드 조작 설정
        setupKeyboardControls();
    });
}

// 엔진 트레일 파티클 소멸 및 페이드 효과 (정지/데스 상태에서도 잔상 처리를 위해 독립 실행)
function updateTrails(deltaTime) {
    if (!spaceship.scene) return;
    for (let i = activeTrails.length - 1; i >= 0; i--) {
        let t = activeTrails[i];
        t.age += deltaTime;
        if (t.age >= t.lifespan) {
            spaceship.scene.remove(t.mesh);
            t.mesh.geometry.dispose();
            t.mesh.material.dispose();
            activeTrails.splice(i, 1);
        } else {
            if (t.isSmoke) {
                // 연기는 점점 팽창하며 흐려짐
                let progress = t.age / t.lifespan;
                t.mesh.material.opacity = 0.6 * (1.0 - progress);
                let expand = 1.0 + (progress * 2.0); // 최대 3배 팽창
                t.mesh.scale.setScalar(expand);
            } else {
                // 부스터 등 선형 리본 방식: 선의 굵기(X, Y)만 줄어들게 연속성 유지
                let progress = t.age / t.lifespan;
                t.mesh.material.opacity = (1.0 - progress) * (t.lifespan > 0.3 ? 0.9 : 0.6);
                let shrink = 1.0 - progress;
                t.mesh.scale.set(shrink > 0.01 ? shrink : 0.01, shrink > 0.01 ? shrink : 0.01, 1);
            }
        }
    }
}

// 스폰 / 디스폰 로직 (온라인 게임 라이프사이클)
function spawnSpaceship() {
    if (!spaceship.mesh || !spaceship.scene) return;
    spaceship.scene.add(spaceship.mesh);
    spaceship.mesh.position.set(0, 0, 0); // 중앙 리스폰
    spaceship.yawAngle = 0;
    spaceship.pitchAngle = 0;
    spaceship.rollAngle = 0;
    spaceship.frozen = false;
    
    // 점프/텔레포트 시 선이 쭉 그어지는 현상 방지
    spaceship.lastHardpointPos = [];
}

function despawnSpaceship() {
    if (!spaceship.mesh || !spaceship.scene) return;
    spaceship.scene.remove(spaceship.mesh);
    spaceship.frozen = true;
}

// 공개 함수들
window.initMyShipControl = initMyShipControl;
window.updateSpaceship = updateSpaceship;
window.updateSpaceshipAnimation = updateSpaceshipAnimation;
window.updateProjectiles = updateProjectiles;
window.updateTrails = updateTrails;
window.spawnSpaceship = spawnSpaceship;
window.despawnSpaceship = despawnSpaceship;