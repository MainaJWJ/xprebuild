window.aaGunManager = {
    aaGun: null,
    aaWeapon: null,

    init: function(scene) {
        this.aaGun = new THREE.Object3D();
        this.aaGun.position.set(1000, 2000, 3000); // 기본 스폰 좌표 (우주 정중앙)
        scene.add(this.aaGun);

        this.aaWeapon = {
            weaponFile: "model/weapons/laser/laser.json",
            currentAmmo: 999999, // 무한탄창
            lastFired: 0,
            hardpoints: [{x:0, y:0, z:0}], // 중앙(0,0,0)에서 단일 빔 발사. 다연장으로 하려면 더 추가.
            data: {
                visuals: {
                    color: "#f6ff00ff", // 위협적인 붉은 광선색
                    geometry: "cylinder",
                    length: 200,
                    radius: 300
                },
                performance: {
                     // 체험용이므로 데미지는 일부러 0으로! (안 죽고 피격 이펙트만 살림)
                    damage: 0,
                    fireRate: 0.005, // 엄청난 연사속도 적용
                    speed: 3000, 
                    spread: 0.7, // 무섭게 뿌려지는 넓은 탄퍼짐
                    lifespan: 80.0,
                    fadeTime: 5
                }
            }
        };
        console.log("AA Gun Manager Initialized");
    },

    update: function(spaceship) {
        // 대공포나 무기 발사체계, 타겟(플레이어 기체)가 없으면 작동 안함
        if (!this.aaGun || !window.fireWeaponSystem || !spaceship || !spaceship.mesh) return;
        
        // 1. 대공포탑이 내 우주선의 최신 위치를 실시간으로 바라보게 조준 (이때 대공포의 -Z축이 기체를 향함)
        this.aaGun.lookAt(spaceship.mesh.position);
        
        // 2. 발사 엔진(fireWeaponSystem)은 기준 방향을 로컬 +X축(기체 정면)으로 인식하므로 축을 90도(위상 반전) 꺾어서 정렬
        this.aaGun.rotateY(-Math.PI / 2);
        
        // 3. 발사 명령! (false = 적군 총알이므로 내 기체를 타격하도록 지정)
        window.fireWeaponSystem(this.aaWeapon, this.aaGun, false);
    }
};
