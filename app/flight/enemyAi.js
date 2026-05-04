// enemyAi.js

window.EnemyAI = {
    // 적 기체 초기화 (무기 스펙 비동기 로드 등)
    init: async function(enemy) {
        enemy.aiState = {
            mode: 'patrol',
            waypoint: this.getRandomWaypoint(enemy, enemy.config.ai.patrolRadius || 1000),
            weapons: []
        };
        
        // 무기 로드
        if (enemy.config.combat && enemy.config.combat.weapons) {
            for (let w of enemy.config.combat.weapons) {
                try {
                    const resp = await fetch('./' + w.weaponFile);
                    if (resp.ok) {
                        const weaponData = await resp.json();
                        enemy.aiState.weapons.push({
                            hardpoints: w.hardpoints,
                            data: weaponData,
                            lastFired: 0,
                            currentAmmo: weaponData.performance.ammo
                        });
                    }
                } catch(e) {
                    console.error("Enemy weapon load error: ", e);
                }
            }
        }
    },

    // 매 프레임 업데이트
    update: function(enemy, deltaTime, playerShip, scene) {
        if (!enemy.aiState) {
            this.init(enemy); // 비동기이지만 다음 프레임부터 상태가 적용됨
            // 초기화를 위해 더미 객체 삽입 방어
            enemy.aiState = { mode: 'init', waypoint: enemy.group.position.clone(), weapons: [] };
            return;
        }
        if (enemy.aiState.mode === 'init') return; // 로딩 대기

        const aiConfig = enemy.config.ai;
        let targetPos = null;
        
        // 1. 피아 식별 여부 (거리 기반 상태 전환)
        let distToPlayer = Infinity;
        if (playerShip && playerShip.mesh) {
            distToPlayer = enemy.group.position.distanceTo(playerShip.mesh.position);
        }

        if (distToPlayer < aiConfig.detectionRange) {
            enemy.aiState.mode = 'pursuit';
        } else {
            // 거리가 멀어지면 흥미를 잃고 정찰로 복귀
            if (enemy.aiState.mode === 'pursuit' && distToPlayer > aiConfig.detectionRange * 1.5) {
                enemy.aiState.mode = 'patrol';
                enemy.aiState.waypoint = this.getRandomWaypoint(enemy, aiConfig.patrolRadius);
            }
        }

        // 2. 모드에 따른 목표(Target) 설정 및 반격(사격)
        if (enemy.aiState.mode === 'pursuit') {
            targetPos = playerShip.mesh.position.clone();
            
            // 플레이어가 총 사거리(첫 번째 무기 기준, 임의로 detectionRange의 절반) 오면 발사
            if (distToPlayer < aiConfig.detectionRange * 0.8 && window.fireWeaponSystem) {
                enemy.aiState.weapons.forEach(weap => {
                    window.fireWeaponSystem(weap, enemy.group, false); // isPlayer = false
                });
            }
            
        } else {
            // 패트롤 웨이포인트 추적
            targetPos = enemy.aiState.waypoint;
            if (enemy.group.position.distanceTo(targetPos) < 100) {
                enemy.aiState.waypoint = this.getRandomWaypoint(enemy, aiConfig.patrolRadius);
            }
        }

        // 3. 완전 3D 회전 (Quaternion Slerp 구면 선형 보간)
        const dummyObj = new THREE.Object3D();
        dummyObj.position.copy(enemy.group.position);
        dummyObj.lookAt(targetPos);
        
        // Three.js의 lookAt은 기본적으로 -Z축을 목표로 맞춤. 우리 기체의 정면은 +X축이므로 회전 보정 필요.
        const correctionQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        dummyObj.quaternion.multiply(correctionQuat);

        const targetQuat = dummyObj.quaternion;
        
        // 회전 스피드 적용
        enemy.group.quaternion.slerp(targetQuat, aiConfig.turnSpeed || 0.05);

        // 4. 로컬 +X(정면) 방향으로 스피드만큼 전진
        const forward = new THREE.Vector3(1, 0, 0);
        forward.applyQuaternion(enemy.group.quaternion);
        enemy.group.position.addScaledVector(forward, aiConfig.speed * deltaTime);
    },

    // 주변의 무작위 3D 좌표 생성기
    getRandomWaypoint: function(enemy, radius) {
        const startPos = enemy.config.position || {x: 0, y: 0, z: 0};
        // Y축도 위아래로 역동적으로 날도록 전체 구면 랜덤화
        return new THREE.Vector3(
            startPos.x + (Math.random() - 0.5) * radius * 2,
            startPos.y + (Math.random() - 0.5) * radius * 2,
            startPos.z + (Math.random() - 0.5) * radius * 2
        );
    }
};

// 범용 AI 통합 시스템 업데이트기 (index.html에서 매 프레임 호출됨)
window.updateAllEnemyAI = function(deltaTime, playerShip, scene) {
    if (!window.celestialBodyManager || !window.celestialBodyManager.bodies) return;
    
    const enemies = window.celestialBodyManager.bodies.filter(b => b.type === 'enemy' && b.group);
    enemies.forEach(enemy => {
        if (enemy.config && enemy.config.ai && enemy.config.ai.script === 'enemyAi') {
            if (window.EnemyAI) {
                window.EnemyAI.update(enemy, deltaTime, playerShip, scene);
            }
        }
        // 추후 anotherAi가 있다면 여기에 || 추가로 플러그인처럼 연결 가능.
    });
};
