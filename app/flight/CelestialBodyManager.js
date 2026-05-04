// CelestialBodyManager.js

/**
 * Celestial Body Manager
 * 
 * 기능:
 * - JSON 설정 파일에 정의된 천체들을 로드하고 관리합니다.
 * - 천체의 공전(Orbit)과 자전(Rotation)을 처리합니다.
 * - 천체의 3D 모델 애니메이션을 업데이트합니다.
 * 
 * 의존성:
 * - Three.js (r128)
 * - GLTFLoader
 * 
 * 사용법:
 * 1. HTML에서 Three.js 및 GLTFLoader를 먼저 로드해야 합니다.
 * 2. 이 스크립트를 로드합니다.
 * 3. `const manager = new CelestialBodyManager(scene);` 로 인스턴스를 생성합니다.
 * 4. `await manager.loadBodies(['black_hole', 'earth', ...]);`로 천체들을 로드합니다.
 * 5. 애니메이션 루프에서 `manager.update(deltaTime);`를 호출합니다.
 */

class CelestialBodyManager {
  /**
   * 생성자
   * @param {THREE.Scene} scene - Three.js Scene 객체
   */
  constructor(scene) {
    this.scene = scene;
    this.bodies = []; // 로드된 천체 객체들을 저장할 배열
    this.solarSystemScale = 1.0; // 기본값 설정
    this.loadSettings(); // 설정 로드
  }

  /**
   * setting.json 파일에서 설정을 로드합니다.
   */
  async loadSettings() {
    try {
      const response = await fetch('./setting.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const settings = await response.json();
      this.solarSystemScale = settings.solarSystemScale || 1.0;
      console.log('Settings loaded:', settings);
    } catch (error) {
      console.error('Failed to load settings, using default values.', error);
    }
  }

  /**
   * 지정된 이름의 천체들을 로드합니다.
   * @param {string[]} bodyNames - 로드할 천체들의 이름 배열 (예: ['black_hole', 'earth'])
   */
  async loadBodies(bodyNames) {
    // 설정이 로드될 때까지 기다림
    await this.loadSettings();
    
    const loader = new THREE.GLTFLoader();

    for (const bodyName of bodyNames) {
      try {
        console.log(`Loading celestial body: ${bodyName}`);
        
        // 1. 천체 설정 파일 로드
        const configPath = `model/${bodyName}/${bodyName}.json`;
        const configResponse = await fetch(configPath);
        if (!configResponse.ok) {
          throw new Error(`Failed to load config for ${bodyName}: HTTP ${configResponse.status}`);
        }
        const config = await configResponse.json();
        console.log(`Config for '${bodyName}' loaded:`, config);

        // 2. 3D 모델 로드
        const modelPath = config.model.file;
        const gltf = await new Promise((resolve, reject) => {
          loader.load(modelPath, resolve, undefined, reject);
        });

        const model = gltf.scene;
        
        // 3. 모델 설정 적용 (크기, 초기 회전) - solarSystemScale 적용
        const scale = (config.model.scale || 1) * this.solarSystemScale;
        model.scale.set(scale, scale, scale);

        // 초기 회전 설정
        if (config.model.initialRotation) {
            model.rotation.set(
                THREE.MathUtils.degToRad(config.model.initialRotation.x),
                THREE.MathUtils.degToRad(config.model.initialRotation.y),
                THREE.MathUtils.degToRad(config.model.initialRotation.z)
            );
        }

        // 4. 움직임 정보 처리 (공전, 자전) - solarSystemScale 적용
        const movement = config.movement || {};
        const orbitConfig = movement.orbit || {};
        const rotationConfig = movement.rotation || {};

        // orbitConfig의 distance에 solarSystemScale 적용
        if (orbitConfig.distance) {
          orbitConfig.distance *= this.solarSystemScale;
        }

        // orbitConfig의 target이 객체인 경우에 solarSystemScale 적용
        if (orbitConfig.target && typeof orbitConfig.target === 'object' && orbitConfig.target !== null) {
          if (orbitConfig.target.x !== undefined) orbitConfig.target.x *= this.solarSystemScale;
          if (orbitConfig.target.y !== undefined) orbitConfig.target.y *= this.solarSystemScale;
          if (orbitConfig.target.z !== undefined) orbitConfig.target.z *= this.solarSystemScale;
        }

        let bodyObject;
        // 공전 정보가 있고, 속도가 0이 아니면 공전하는 천체로 처리
        // distance가 0이어도 공전 중심에 가만히 있게 함
        if (orbitConfig.speed) {
            // 공전하는 천체
            const group = new THREE.Group();
            group.add(model);
            
            // 공전 중심 설정 (문자열 이름 또는 {x, y, z} 객체)
            let orbitCenter = { x: 0, y: 0, z: 0 };
            let orbitCenterBody = null; // 공전 중심이 되는 천체 객체 참조
            
            if (orbitConfig.target) {
                if (typeof orbitConfig.target === 'object' && orbitConfig.target !== null) {
                    // 직접 좌표 지정
                    orbitCenter = orbitConfig.target;
                } else if (typeof orbitConfig.target === 'string') {
                    // 천체 이름으로 참조
                    orbitCenterBody = orbitConfig.target;
                }
            }

            // distance가 0이면 공전 중심에 가만히 있게 함
            if (orbitConfig.distance === 0) {
                // 천체 이름으로 참조하는 경우, 초기 위치는 0,0,0으로 설정하고 업데이트 루프에서 위치를 계산
                if (orbitCenterBody) {
                    group.position.set(0, 0, 0);
                } else {
                    group.position.set(orbitCenter.x, orbitCenter.y, orbitCenter.z);
                }
                
                bodyObject = {
                    name: config.name || bodyName,
                    type: config.type || 'unknown',
                    model: model,
                    group: group,
                    mixer: null,
                    orbit: orbitConfig,
                    rotation: rotationConfig,
                    angle: 0,
                    orbitCenter: orbitCenter,
                    orbitCenterBody: orbitCenterBody, // 천체 이름 저장
                    config: config
                };
            } else {
                // 초기 각도와 위치 설정
                const initialAngle = Math.random() * Math.PI * 2;
                const distance = orbitConfig.distance;
                
                // 천체 이름으로 참조하는 경우, 초기 위치는 0,0,0으로 설정하고 업데이트 루프에서 위치를 계산
                if (orbitCenterBody) {
                    group.position.set(0, 0, 0);
                } else {
                    // XY 평면 공전 (간단한 구현)
                    group.position.x = orbitCenter.x + Math.cos(initialAngle) * distance;
                    group.position.z = orbitCenter.z + Math.sin(initialAngle) * distance;
                    // Y 위치는 경사에 따라 계산 (간단한 예)
                    const inclination = THREE.MathUtils.degToRad(orbitConfig.inclination || 0);
                    group.position.y = orbitCenter.y + Math.sin(initialAngle) * distance * Math.sin(inclination);
                }

                bodyObject = {
                    name: config.name || bodyName,
                    type: config.type || 'unknown',
                    model: model,
                    group: group,
                    mixer: null,
                    orbit: orbitConfig,
                    rotation: rotationConfig,
                    angle: initialAngle,
                    orbitCenter: orbitCenter,
                    orbitCenterBody: orbitCenterBody, // 천체 이름 저장
                    config: config // 전투 수치 참조용
                };
            }
            this.scene.add(group);
            console.log(`Added orbiting body '${bodyObject.name}' at initial position:`, group.position);
        } else {
            // 고정된 천체 또는 공전 정보가 없는 천체
            // 위치는 설정 파일의 position 또는 기본값 (0,0,0) - solarSystemScale 적용
            const pos = config.position || { x: 0, y: 0, z: 0 };
            if (pos.x !== undefined) pos.x *= this.solarSystemScale;
            if (pos.y !== undefined) pos.y *= this.solarSystemScale;
            if (pos.z !== undefined) pos.z *= this.solarSystemScale;
            model.position.set(pos.x, pos.y, pos.z);

            bodyObject = {
                name: config.name || bodyName,
                type: config.type || 'unknown',
                model: model,
                group: model, // 고정 천체는 그룹이 자신
                mixer: null,
                orbit: null,
                rotation: rotationConfig,
                angle: 0,
                config: config // 전투 수치(체력 등) 참조용
            };
            this.scene.add(model);
            console.log(`Added static body '${bodyObject.name}' at position:`, model.position);
        }

        // 5. 애니메이션 설정
        if (config.animation && config.animation.enabled && gltf.animations && gltf.animations.length) {
            bodyObject.mixer = new THREE.AnimationMixer(bodyObject.group);
            gltf.animations.forEach((clip) => {
                bodyObject.mixer.clipAction(clip).play();
            });
            console.log(`Animations enabled for '${bodyObject.name}'.`);
        } else if (gltf.animations && gltf.animations.length) {
            // 설정 파일에 animation.enabled가 없지만 애니메이션이 있는 경우 기본적으로 재생
            bodyObject.mixer = new THREE.AnimationMixer(bodyObject.group);
            gltf.animations.forEach((clip) => {
                bodyObject.mixer.clipAction(clip).play();
            });
            console.log(`Animations found and enabled for '${bodyObject.name}' by default.`);
        }

        // 6. 관리 목록에 추가
        this.bodies.push(bodyObject);

        console.log(`Celestial body '${bodyName}' successfully loaded and added to scene.`);
      } catch (error) {
        console.error(`Failed to load celestial body '${bodyName}':`, error);
      }
    }
  }

  /**
   * 모든 천체의 상태를 업데이트합니다 (애니메이션, 공전, 자전).
   * @param {number} deltaTime - 프레임 사이의 시간 간격 (초)
   */
  update(deltaTime) {
    this.bodies.forEach(body => {
      // 1. 모델 내장 애니메이션 업데이트
      if (body.mixer) {
        body.mixer.update(deltaTime);
      }

      // 2. 공전 업데이트
      if (body.orbit && body.orbit.speed && body.orbitCenter) {
        body.angle += body.orbit.speed * deltaTime;
        
        const centerX = body.orbitCenter.x;
        const centerY = body.orbitCenter.y;
        const centerZ = body.orbitCenter.z;
        const radius = body.orbit.distance;
        const inclination = THREE.MathUtils.degToRad(body.orbit.inclination || 0);

        // XY 평면 공전 + 경사
        body.group.position.x = centerX + Math.cos(body.angle) * radius;
        body.group.position.z = centerZ + Math.sin(body.angle) * radius;
        body.group.position.y = centerY + Math.sin(body.angle) * radius * Math.sin(inclination);
      }

      // 3. 자전 업데이트
      if (body.rotation && body.rotation.speed && body.rotation.axis) {
        const axis = new THREE.Vector3(
            body.rotation.axis.x,
            body.rotation.axis.y,
            body.rotation.axis.z
        ).normalize();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(axis, body.rotation.speed * deltaTime);
        // group에 자전을 적용하여 하위 모델도 함께 회전
        body.group.quaternion.multiply(quaternion);
      }
    });
  }
}

// 전역으로 사용할 수 있도록 설정
window.CelestialBodyManager = CelestialBodyManager;