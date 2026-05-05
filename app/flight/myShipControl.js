// myShipControl.js
// 3D 비행 시뮬레이터의 핵심 물리 및 조종 로직을 담당합니다.

const spaceship = {
    mesh: null,
    model: null,
    mixer: null,
    config: null,
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    keys: {},
    frozen: false,
    scene: null,
    lastHardpointPos: [],
    lookAtLine: null
};

let cameraZoom = 1.0;
const CAMERA_ZOOM_SENSITIVITY = 0.1;

const DEFAULT_CONFIG = {
    "model": {
        "file": "model/space shuttle/space shuttle.glb",
        "scale": 0.05,
        "initialRotation": { "x": 0, "y": 90, "z": 0 }
    },
    "performance": {
        "speed": 40,
        "acceleration": 1.5,
        "turnSensitivity": 0.025,
        "pitchLimits": { "up": 80, "down": -60 },
        "maxRollAngle": 24
    },
    "camera": {
        "lerpSpeed": 0.1,
        "lookAtDistance": 50,
        "follow": { "x": -50, "y": 20, "z": 0 }
    }
};

const activeTrails = [];

// --- 1. 초기화 및 모델 로딩 ---

async function loadSpaceshipConfig() {
    try {
        const response = await fetch('./model/space shuttle/space shuttle.json');
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn("Failed to load spaceship config, using defaults.", e);
    }
    return DEFAULT_CONFIG;
}

function loadSpaceshipModel(scene, onReady) {
    const loader = new THREE.GLTFLoader();
    const modelPath = spaceship.config.model.file || DEFAULT_CONFIG.model.file;

    loader.load(modelPath, (gltf) => {
        spaceship.model = gltf.scene;

        if (gltf.animations && gltf.animations.length > 0) {
            spaceship.mixer = new THREE.AnimationMixer(spaceship.model);
            gltf.animations.forEach(clip => spaceship.mixer.clipAction(clip).play());
        }

        const scale = spaceship.config.model.scale || DEFAULT_CONFIG.model.scale;
        spaceship.model.scale.set(scale, scale, scale);

        const rot = spaceship.config.model.initialRotation || DEFAULT_CONFIG.model.initialRotation;
        spaceship.model.rotation.set(
            THREE.MathUtils.degToRad(rot.x),
            THREE.MathUtils.degToRad(rot.y),
            THREE.MathUtils.degToRad(rot.z)
        );

        spaceship.model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        spaceship.mesh = new THREE.Group();
        spaceship.mesh.add(spaceship.model);
        spaceship.mesh.position.set(0, 50, 0);

        if (onReady) onReady();
    });
}

function setupKeyboardControls() {
    window.addEventListener('keydown', e => {
        spaceship.keys[e.key] = true;
        if (e.key.toLowerCase() === 't') spaceship.frozen = !spaceship.frozen;
    });
    window.addEventListener('keyup', e => { spaceship.keys[e.key] = false; });
    window.addEventListener('wheel', e => {
        cameraZoom = THREE.MathUtils.clamp(cameraZoom + e.deltaY * CAMERA_ZOOM_SENSITIVITY * 0.01, 0.1, 10);
    });
}

// --- 2. 물리 및 이동 로직 ---

function updateSpaceship(deltaTime, camera, cameraMode = 'follow') {
    if (!spaceship.mesh || spaceship.frozen) return;

    const config = spaceship.config.performance || DEFAULT_CONFIG.performance;
    const ts = config.turnSensitivity;

    if (spaceship.keys["ArrowDown"]) spaceship.pitchAngle = Math.min(THREE.MathUtils.degToRad(config.pitchLimits.up), spaceship.pitchAngle + ts);
    if (spaceship.keys["ArrowUp"]) spaceship.pitchAngle = Math.max(THREE.MathUtils.degToRad(config.pitchLimits.down), spaceship.pitchAngle - ts);
    if (spaceship.keys["ArrowLeft"]) spaceship.yawAngle += ts;
    if (spaceship.keys["ArrowRight"]) spaceship.yawAngle -= ts;

    let targetRoll = 0;
    const maxRoll = THREE.MathUtils.degToRad(config.maxRollAngle);
    if (spaceship.keys["ArrowLeft"]) targetRoll = -maxRoll;
    else if (spaceship.keys["ArrowRight"]) targetRoll = maxRoll;
    spaceship.rollAngle = THREE.MathUtils.lerp(spaceship.rollAngle, targetRoll, 0.1);

    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
    const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spaceship.pitchAngle);
    const qR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), spaceship.rollAngle);
    spaceship.mesh.quaternion.copy(qY).multiply(qP).multiply(qR);

    const speed = spaceship.keys[" "] ? config.speed * config.acceleration : config.speed;
    const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);
    spaceship.mesh.position.add(dir.multiplyScalar(speed * deltaTime));

    updateCamera(camera, cameraMode);
    spawnParticles(spaceship.keys[" "]);
    updateTrails(deltaTime);
}

function updateCamera(camera, mode) {
    const camConfig = spaceship.config.camera || DEFAULT_CONFIG.camera;
    const modeConfig = camConfig[mode] || camConfig.follow || DEFAULT_CONFIG.camera.follow;
    const offset = new THREE.Vector3(modeConfig.x * cameraZoom, modeConfig.y * cameraZoom, modeConfig.z * cameraZoom);

    spaceship.mesh.updateMatrixWorld();
    const worldCameraPos = offset.applyMatrix4(spaceship.mesh.matrixWorld);

    // 추적 속도 적용
    camera.position.lerp(worldCameraPos, camConfig.lerpSpeed || 0.1);

    // 초점 거리 적용 (mode에 따라 방향 반전)
    const lookDist = camConfig.lookAtDistance || 50;
    const lookAtX = mode === 'follow' ? lookDist : -lookDist * 0.1; // 후방은 보통 조금 덜 멉니다

    const lookAt = new THREE.Vector3(lookAtX, 0, 0).applyQuaternion(spaceship.mesh.quaternion).add(spaceship.mesh.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookAt);

    // 가이드 라인 업데이트
    if (spaceship.lookAtLine) {
        const positions = spaceship.lookAtLine.geometry.attributes.position.array;
        positions[0] = spaceship.mesh.position.x;
        positions[1] = spaceship.mesh.position.y;
        positions[2] = spaceship.mesh.position.z;
        positions[3] = lookAt.x;
        positions[4] = lookAt.y;
        positions[5] = lookAt.z;
        spaceship.lookAtLine.geometry.attributes.position.needsUpdate = true;
    }
}

function spawnParticles(isBoosting) {
    const visuals = spaceship.config.visuals || { engineHardpoints: [{ x: -4, y: 0, z: 0 }], trailColor: "#00ffff" };
    const shipScale = (spaceship.config.model && spaceship.config.model.scale) || 0.05;

    // [2번: 밀도] 한 프레임당 생성할 입자 수 대폭 증가
    const count = isBoosting ? 100 : 5;

    visuals.engineHardpoints.forEach((hp) => {
        for (let i = 0; i < count; i++) {
            // 엔진 위치 계산
            const pos = new THREE.Vector3(hp.x, hp.y, hp.z).applyMatrix4(spaceship.mesh.matrixWorld);

            // [화염 크기 조절] 여기서 숫자를 바꾸면 불꽃 입자의 크기가 바뀝니다.
            const size = (Math.random() * 0.07 + 0.07) * (shipScale * 10);

            // [화염 형태 조절] 여기서 Geometry를 바꾸면 모양이 바뀝니다. (현재는 연기 파편 느낌의 저사양 구체)
            const geom = new THREE.SphereGeometry(size, 4, 4);

            // 초기 색상 (가속 시 흰색, 일반 시 연하늘색)
            const mat = new THREE.MeshBasicMaterial({
                color: isBoosting ? 0xffffff : 0x88ffff,
                transparent: true,
                opacity: 0.002,   // [1번: 블렌딩 최적화] 투명도를 낮춰야 색이 겹치며 예쁘게 나옵니다.
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const particle = new THREE.Mesh(geom, mat);
            particle.position.copy(pos);

            // [형태 수정] 기체의 방향을 복사하고 X축(진행방향)으로 5배 길쭉하게 만듭니다.
            particle.quaternion.copy(spaceship.mesh.quaternion);
            particle.scale.set(5, 1, 1);

            // [화염 퍼짐 조절] spread 값이 클수록 불꽃이 옆으로 더 넓게 퍼집니다.
            const spread = isBoosting ? 0.5 : 0.2;
            const velocity = new THREE.Vector3(
                -1,                             // 뒤쪽 방향 힘
                (Math.random() - 0.5) * spread, // 위아래(세로) 퍼짐
                (Math.random() - 0.5) * spread  // 좌우(가로) 퍼짐
            );
            velocity.applyQuaternion(spaceship.mesh.quaternion);

            // [화염 길이/속도 조절] 숫자가 클수록 불꽃이 더 멀리, 빠르게 뿜어져 나옵니다.
            velocity.multiplyScalar(isBoosting ? 80 : 35);

            spaceship.scene.add(particle);

            activeTrails.push({
                mesh: particle,
                velocity: velocity,
                age: 0,
                // [화염 수명 조절] 숫자를 키우면 불꽃 꼬리가 더 길게 유지됩니다.
                lifespan: Math.random() * 0.5 + 0.5
            });
        }
    });
}

function updateTrails(dt) {
    for (let i = activeTrails.length - 1; i >= 0; i--) {
        const p = activeTrails[i];
        p.age += dt;

        if (p.age >= p.lifespan) {
            spaceship.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            activeTrails.splice(i, 1);
        } else {
            const progress = p.age / p.lifespan;

            // 1. 위치 이동
            p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));

            // 2. 색상 변화 (하늘색 -> 주황색 -> 빨간색)
            if (progress < 0.2) {
                p.mesh.material.color.setHex(0x88ffff);
            } else if (progress < 0.5) {
                p.mesh.material.color.setHex(0xffaa00);
            } else {
                p.mesh.material.color.setHex(0xff3300);
            }

            // [3번: 팽창] 크기 팽창 계수를 5.0으로 상향 (타원 형태 유지)
            const s = 1.0 + progress * 5.0;
            p.mesh.scale.set(s * 3, s, s); // X축 3배 비율 유지
            p.mesh.material.opacity = (1.0 - progress) * 0.8;
        }
    }
}

// --- 3. 외부 인터페이스 ---

function spawnSpaceship() {
    if (!spaceship.mesh) return;
    spaceship.scene.add(spaceship.mesh);
    spaceship.mesh.position.set(0, 50, 0);
    spaceship.frozen = false;
    spaceship.lastHardpointPos = [];
}

function despawnSpaceship() {
    if (spaceship.mesh) spaceship.scene.remove(spaceship.mesh);
    spaceship.frozen = true;
}

async function initMyShipControl(scene, camera) {
    spaceship.scene = scene;
    spaceship.config = await loadSpaceshipConfig();

    // 가이드 라인 초기화 (빨간색)
    const lineGeom = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    spaceship.lookAtLine = new THREE.Line(lineGeom, lineMat);
    spaceship.lookAtLine.frustumCulled = false; // 시야각 최적화 제외 (깜빡임 방지)
    scene.add(spaceship.lookAtLine);

    return new Promise(resolve => {
        loadSpaceshipModel(scene, () => {
            setupKeyboardControls();
            resolve();
        });
    });
}

window.initMyShipControl = initMyShipControl;
window.updateSpaceship = updateSpaceship;
window.updateSpaceshipAnimation = dt => spaceship.mixer && spaceship.mixer.update(dt);
window.spawnSpaceship = spawnSpaceship;
window.despawnSpaceship = despawnSpaceship;
window.spaceship = spaceship;