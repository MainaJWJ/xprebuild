// core/playerState.js

class PlayerState {
    constructor() {
        this.nickname = "Player";
        this.isAlive = false;
        
        // 레벨 및 성장
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100; // 초기 필요 경험치 레벨 디자인
        
        this.upgradePoints = 0; // 업그레이드 포인트 (레벨업 마다 1 획득)

        // 6대 핵심 스탯의 기초값 (base) 및 현재 계산된 배율(multiplier) 관리
        // 배율은 업그레이드 선택 시마다 1.05 (5%) 씩 점복리 증가
        this.stats = {
            speed: { base: 60, multi: 1.0 },       // 기체 속도
            turnRate: { base: 0.025, multi: 1.0 }, // 선회력
            damage: { base: 10, multi: 1.0 },      // 무기 공격력
            bulletSpeed: { base: 200, multi: 1.0 },// 탄환 속도
            fireRate: { base: 1.0, multi: 1.0 },   // 연사력 (발사 쿨타임 감소 등 역연산 반영)
            hp: { base: 100, multi: 1.0 },         // 최대 체력
        };
        
        this.currentHp = 100; // 현재 체력
    }

    // 닉네임 설정 (로비용)
    setNickname(name) {
        this.nickname = name || "Unknown_Pilot";
    }

    // 게임 시작 시 초기화
    resetForSpawn() {
        this.isAlive = true;
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.upgradePoints = 0;
        
        for (let key in this.stats) {
            this.stats[key].multi = 1.0;
        }
        
        this.currentHp = this.getMaxHp();
        if (window.updateStatsUI) window.updateStatsUI(this);
    }

    // 경험치 획득 및 레벨업 체크
    addXp(amount) {
        if (!this.isAlive) return;
        
        this.xp += amount;
        let leveledUp = false;

        // .io 특유의 연속 레벨업 처리 루프
        while (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this.level++;
            this.upgradePoints++;
            // 다음 레벨 요구 경험치는 20%씩 증가
            this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.2); 
            leveledUp = true;
        }

        if (leveledUp) {
            // 업그레이드 UI 트리거 (ui/upgradeUI.js 에서 글로벌 할당될 함수)
            if (window.showUpgradeUI) window.showUpgradeUI();
        }
        
        // UI 갱신 등 훅 필요시
        if (window.updateLeaderboardPlayerXp) window.updateLeaderboardPlayerXp(this.xp);
    }

    // 업그레이드 커밋 (스탯 5% 강화)
    upgradeStat(statKey) {
        if (this.upgradePoints > 0 && this.stats[statKey]) {
            this.stats[statKey].multi *= 1.05; // 5% 강화 복리 적용
            this.upgradePoints--;
            
            // 최대 체력이 증가했다면, 증가한 퍼센트비율만큼 현재체력도 회복
            if (statKey === 'hp') {
                this.currentHp *= 1.05; 
            }
            
            if (window.updateStatsUI) window.updateStatsUI(this);
            return true;
        }
        return false;
    }

    // 현재 계산된 최종 스탯 가져오기 게터
    getFinal(statKey) {
        const s = this.stats[statKey];
        return s.base * s.multi;
    }

    getMaxHp() { return this.getFinal('hp'); }
    getSpeed() { return this.getFinal('speed'); }
    getTurnRate() { return this.getFinal('turnRate'); }
    getDamage() { return this.getFinal('damage'); }
    getBulletSpeed() { return this.getFinal('bulletSpeed'); }
    getFireRate() { return this.getFinal('fireRate'); }
}

// 글로벌 전역 싱글톤 객체 인스턴스화
window.playerState = new PlayerState();
