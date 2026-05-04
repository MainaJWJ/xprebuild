(function() {
    // 1. CSS Variable Definitions (Root)
    const style = document.createElement('style');
    style.innerHTML = `
        :root {
            --crt-scanline-opacity: 0.2;
            --crt-flicker-intensity: 0.18;
            --crt-brightness: 1.0;
            --crt-contrast: 1.05;
            --crt-blur: 0.4px;
            --crt-vignette-opacity: 0.4;
            --crt-roll-intensity: 1.0;
            --crt-grayscale: 0;
        }

        #crt-filter-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 999999;
            background: 
                repeating-linear-gradient(
                    rgba(18, 16, 16, 0) 0,
                    rgba(18, 16, 16, var(--crt-scanline-opacity)) 1px,
                    rgba(18, 16, 16, 0) 3px
                ),
                radial-gradient(
                    rgba(18, 16, 16, 0) 50%,
                    rgba(0, 0, 0, var(--crt-vignette-opacity)) 100%
                );
            background-size: 100% 4px, 100% 100%;
            transition: opacity 0.3s;
        }

        body {
            filter: url(#crt-curvature) contrast(var(--crt-contrast)) brightness(var(--crt-brightness)) grayscale(var(--crt-grayscale));
        }

        @keyframes crt-flicker {
            0% { opacity: calc(var(--crt-flicker-intensity) * 0.02); }
            50% { opacity: calc(var(--crt-flicker-intensity) * 0.06); }
            100% { opacity: calc(var(--crt-flicker-intensity) * 0.02); }
        }

        #crt-filter-overlay::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            opacity: 0; /* Default to transparent when animation is off */
            animation: crt-flicker 0.1s infinite;
            pointer-events: none;
        }

        /* Filter Control State */
        .crt-disabled-filter #crt-filter-overlay {
            display: none !important;
        }
        .crt-disabled-filter body {
            filter: none !important;
        }
        .crt-paused-flicker #crt-filter-overlay::after {
            animation: none !important;
        }

        /* Rolling Noise Bar */
        .crt-roll-bar {
            position: absolute;
            left: 0;
            width: 100%;
            height: 120px;
            background: linear-gradient(
                rgba(0, 0, 0, 0) 0%,
                rgba(255, 255, 255, calc(0.05 * var(--crt-roll-intensity, 1))) 50%,
                rgba(0, 0, 0, 0) 100%
            );
            mix-blend-mode: overlay;
            pointer-events: none;
            z-index: 2;
            opacity: 1; /* Elements alpha is now fixed, intensity scales the gradient */
            animation: crt-roll-anim 8s linear infinite;
        }

        @keyframes crt-roll-anim {
            0% { transform: translateY(110vh); }
            100% { transform: translateY(-20vh); }
        }
    `;
    document.head.appendChild(style);

    // 2. SVG filter definition
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.style.cssText = "position:absolute; width:0; height:0; pointer-events:none;";
    svg.innerHTML = `
        <defs>
          <filter id="crt-curvature" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="blur" />
          </filter>
        </defs>
    `;
    document.body.appendChild(svg);

    // 3. Main CRT Overlay
    const overlay = document.createElement('div');
    overlay.id = 'crt-filter-overlay';
    document.body.appendChild(overlay);

    // Add Rolling Noise Bar
    const rollBar = document.createElement('div');
    rollBar.className = 'crt-roll-bar';
    overlay.appendChild(rollBar);

    // 4. CRT Logic Engine
    const controlMap = {
        'input-scanlines': '--crt-scanline-opacity',
        'input-flicker': '--crt-flicker-intensity',
        'input-roll': '--crt-roll-intensity',
        'input-brightness': '--crt-brightness',
        'input-vignette': '--crt-vignette-opacity'
    };

    window.crtController = {
        updateParam: (id, value) => {
            const cssVar = controlMap[id];
            if (cssVar) {
                document.documentElement.style.setProperty(cssVar, value);
            }
        },
        toggleFilter: (enabled) => {
            if (enabled) {
                document.documentElement.classList.remove('crt-disabled-filter');
            } else {
                document.documentElement.classList.add('crt-disabled-filter');
            }
        },
        togglePause: (paused) => {
            if (paused) {
                document.documentElement.classList.add('crt-paused-flicker');
            } else {
                document.documentElement.classList.remove('crt-paused-flicker');
            }
        },
        toggleGrayscale: (enabled) => {
            document.documentElement.style.setProperty('--crt-grayscale', enabled ? '1' : '0');
        },
        reset: () => {
            document.documentElement.style.setProperty('--crt-scanline-opacity', '0.2');
            document.documentElement.style.setProperty('--crt-flicker-intensity', '0.18');
            document.documentElement.style.setProperty('--crt-roll-intensity', '1.0');
            document.documentElement.style.setProperty('--crt-brightness', '1.0');
            document.documentElement.style.setProperty('--crt-vignette-opacity', '0.4');
            document.documentElement.style.setProperty('--crt-grayscale', '0');
            document.documentElement.classList.remove('crt-disabled-filter');
            document.documentElement.classList.remove('crt-paused-flicker');
        }
    };

    // 5. Handle messages from Properties App
    window.addEventListener('message', (e) => {
        const data = e.data;
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
            case 'updateCRTParam':
                window.crtController.updateParam(data.id, data.value);
                break;
            case 'toggleCRT':
                window.crtController.toggleFilter(data.state);
                break;
            case 'toggleCRTPause':
                window.crtController.togglePause(data.state);
                break;
            case 'toggleCRTGrayscale':
                window.crtController.toggleGrayscale(data.state);
                break;
            case 'requestCRTState':
                // Send current state back to the properties window
                e.source.postMessage({
                    type: 'crtState',
                    params: {
                        'input-scanlines': getComputedStyle(document.documentElement).getPropertyValue('--crt-scanline-opacity').trim() || '0.2',
                        'input-flicker': getComputedStyle(document.documentElement).getPropertyValue('--crt-flicker-intensity').trim() || '0.18',
                        'input-roll': getComputedStyle(document.documentElement).getPropertyValue('--crt-roll-intensity').trim() || '1.0',
                        'input-brightness': getComputedStyle(document.documentElement).getPropertyValue('--crt-brightness').trim() || '1.0',
                        'input-vignette': getComputedStyle(document.documentElement).getPropertyValue('--crt-vignette-opacity').trim() || '0.4',
                        'grayscale': getComputedStyle(document.documentElement).getPropertyValue('--crt-grayscale').trim() === '1',
                        'enabled': !document.documentElement.classList.contains('crt-disabled-filter')
                    }
                }, '*');
                break;
            case 'resetCRT':
                window.crtController.reset();
                break;
        }
    });

    // 6. Taskbar Interaction (Robust Binding)
    const setupTaskbarTrigger = () => {
        const taskbarFrame = document.getElementById('taskbar-frame');
        if (!taskbarFrame) return;

        let attempts = 0;
        const maxAttempts = 10;
        const retryInterval = 500; // Check every 0.5s

        const bindIcon = () => {
            try {
                const doc = taskbarFrame.contentDocument;
                if (!doc) return false;
                
                const statusIcon = doc.querySelector('img[alt="상태"]');
                if (statusIcon) {
                    // Success! Bind the click event
                    statusIcon.style.cursor = 'pointer';
                    statusIcon.title = "CRT Monitor Settings (via Display Properties)";
                    statusIcon.onclick = (e) => {
                        e.stopPropagation();
                        window.parent.postMessage({ 
                            type: 'launchApp', 
                            appId: 'display-properties',
                            payload: { targetTab: 'tab-effect' }
                        }, '*');
                    };
                    return true;
                }
            } catch (e) {
                // Cross-origin or other frame access errors
            }
            return false;
        };

        const tryBind = () => {
            if (bindIcon()) {
                console.log("CRT Engine: Taskbar icon bound successfully.");
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(tryBind, retryInterval);
            } else {
                console.warn("CRT Engine: Failed to bind taskbar icon after", maxAttempts, "attempts.");
            }
        };

        // Initial attempt + backup on frame load
        tryBind();
        taskbarFrame.addEventListener('load', tryBind);
    };

    setupTaskbarTrigger();
    console.log("CRT Engine Relocated & Refactored.");
})();
