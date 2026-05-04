// core/gameState.js

class GameState {
    constructor() {
        this.currentState = 'LOBBY'; // LOBBY, PLAYING, DEAD
        
        // 의존성 UI 컨테이너 캐시 (window.onload 나 init 호출 시 맵핑됨)
        this.containerLobby = null;
        this.containerGame = null;
        this.containerDeath = null;
    }

    initDOM() {
        this.containerLobby = document.getElementById('lobby-layer');
        this.containerGame = document.getElementById('hud-container'); // HUD 전체 감싸는 부모
        this.containerDeath = document.getElementById('death-layer');
        
        // 초기 뷰 렌더링
        this.showLobby();
    }

    showLobby() {
        this.currentState = 'LOBBY';
        if(this.containerLobby) this.containerLobby.style.display = 'flex';
        // 로비에서는 UI(HUD)를 안보이게 처리
        if(this.containerGame) this.containerGame.style.display = 'none'; 
        if(this.containerDeath) this.containerDeath.style.display = 'none';
        
        // 기체를 화면에서 지우고 정지 (스펙테이터 모드)
        if(window.despawnSpaceship) window.despawnSpaceship();
    }

    startGame(nickname) {
        this.currentState = 'PLAYING';
        
        // 플래이어 상태 리셋 및 닉네임 전송
        window.playerState.setNickname(nickname);
        window.playerState.resetForSpawn();
        
        // 화면에 기체를 실제로 스폰
        if(window.spawnSpaceship) window.spawnSpaceship();

        // 컨테이너 스위칭
        if(this.containerLobby) this.containerLobby.style.display = 'none';
        if(this.containerDeath) this.containerDeath.style.display = 'none';
        if(this.containerGame) this.containerGame.style.display = 'block';

        console.log(`[GameState] Game Started! Welcome, ${nickname}`);
    }

    playerDied() {
        if (this.currentState === 'DEAD') return;
        this.currentState = 'DEAD';
        window.playerState.isAlive = false;

        // 기체를 화면에서 폭파/제거
        if(window.despawnSpaceship) window.despawnSpaceship();
        
        // HUD 은닉
        if(this.containerGame) this.containerGame.style.display = 'none'; 

        if(this.containerDeath) {
            this.containerDeath.style.display = 'flex';
            let scoreElem = document.getElementById('death-score');
            if(scoreElem) scoreElem.innerText = `Final Score: ${Math.floor(window.playerState.xp)} XP (Lv.${window.playerState.level})`;
        }

        console.log("[GameState] Player Died.");
    }
}

// 싱글톤
window.gameStateManager = new GameState();
