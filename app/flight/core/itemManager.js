// core/itemManager.js

class ItemManager {
    constructor() {
        this.scene = null;
        this.items = [];
        this.spawnTimer = 0;
        this.spawnIntervalMin = 3;  // 최소 스폰 대기시간 (초)
        this.spawnIntervalMax = 7;  // 최대 스폰 대기시간 (초)
        this.maxItems = 100;        // 맵에 존재할 수 있는 최대 구슬 개수
        this.itemLifespan = 60;     // 1분 수명
    }

    init(scene) {
        this.scene = scene;
        console.log("Item Manager Initialized");
    }

    update(delta, spaceship) {
        if (!this.scene) return;

        // 아이템 스폰 타이머 로직
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.spawnIntervalMin + Math.random() * (this.spawnIntervalMax - this.spawnIntervalMin);
            if (this.items.length < this.maxItems) {
                // 한 번에 여러 개를 뿌리거나 1개씩 뿌릴 수 있음 (여기서는 1개씩 더 자주 뿌림)
                this.spawnItem();
            }
        }

        // 아이템 생명주기 및 충돌 처리
        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            item.age += delta;

            // 1분(60초) 경과 시 자연 소멸
            if (item.age >= this.itemLifespan) {
                this.scene.remove(item.mesh);
                item.mesh.geometry.dispose();
                item.mesh.material.dispose();
                this.items.splice(i, 1);
                continue;
            }
            
            // 약간의 애니메이션 효과 (자전)
            item.mesh.rotation.y += delta;
            item.mesh.rotation.x += delta * 0.5;

            // 플레이어와의 충돌 판정 (현재 접속하여 조종중인 상태일 때만)
            if (window.gameStateManager && window.gameStateManager.currentState === 'PLAYING' && spaceship && spaceship.mesh) {
                if (!spaceship.frozen) {
                    let d = item.mesh.position.distanceTo(spaceship.mesh.position);
                    let itemRadius = item.mesh.geometry.parameters.radius;
                    let hitRadius = 40; // 기체의 힛박스 반경 (조금 넉넉하게 적용)
                    
                    if (d < hitRadius + itemRadius) {
                        // 아이템 획득!
                        if (window.playerState) {
                            let xpAward = 30 + Math.floor(Math.random() * 40); // 30 ~ 70 랜덤 XP 
                            window.playerState.addXp(xpAward);
                            // 간단한 플로팅 효과보다 일단은 콘솔과 로그로 알림
                            console.log(`%c[아이템 획득!] +${xpAward} XP (현재 레벨: ${window.playerState.level})`, 'color: #bbffbb; background:#005500; font-weight: bold;');
                        }
                        
                        // 화면에서 즉시 제거
                        this.scene.remove(item.mesh);
                        item.mesh.geometry.dispose();
                        item.mesh.material.dispose();
                        this.items.splice(i, 1);
                    }
                }
            }
        }
    }

    spawnItem() {
        // 붉은색 빛나는 공 모양 (기존보다 10배 확대)
        const geometry = new THREE.SphereGeometry(200, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff3333, // 밝고 선명한 레드
            wireframe: false 
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // 아이템 구슬이 약간 반투명하고 글로우효과처럼 보이도록 
        material.transparent = true;
        material.opacity = 0.8;

        // 플레이어가 도달할 만한, 너무 멀지 않은 랜덤 반경에 배치
        // (우주 공간의 x: -6000 ~ +6000, y: -2000 ~ +2000, z: -6000 ~ +6000)
        let rx = (Math.random() - 0.5) * 12000;
        let ry = (Math.random() - 0.5) * 4000;
        let rz = (Math.random() - 0.5) * 12000;

        mesh.position.set(rx, ry, rz);
        this.scene.add(mesh);

        this.items.push({
            mesh: mesh,
            age: 0
        });
    }
}

// 글로벌 등록
window.itemManager = new ItemManager();
