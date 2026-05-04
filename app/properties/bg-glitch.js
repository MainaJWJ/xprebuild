import { XPFilterFactory } from './XPFilterFactory.js';

(function() {
    let scene, camera, renderer, mesh, material;
    let canvas;
    const desktopWrapper = document.getElementById('desktop-wrapper');
    if (!desktopWrapper) return;

    // 1. Setup Canvas Container
    const container = document.createElement('div');
    container.id = 'bg-glitch-container';
    container.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; z-index:-1; overflow:hidden; pointer-events:none;';
    desktopWrapper.insertBefore(container, desktopWrapper.firstChild);

    // 2. Initialize Three.js
    const init = () => {
        scene = new THREE.Scene();
        const aspect = window.innerWidth / window.innerHeight;
        camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);
        camera.position.z = 1;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        canvas = renderer.domElement;
        container.appendChild(canvas);

        // Load Wallpaper Texture
        // We'll try to get the current wallpaper from the style, but for now we use the default
        const img = new Image();
        img.src = './image/wallpaper.bmp';
        
        img.onload = () => {
            const texture = new THREE.Texture(img);
            texture.needsUpdate = true;
            
            const geometry = new THREE.PlaneGeometry(2 * aspect, 2);
            // Default to 'combined' filter but with 0 intensity initially
            material = XPFilterFactory.createMaterial('combined', {
                u_texture: texture,
                resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
                pixelRatio: window.devicePixelRatio,
                intensity: 0.0, // Start with no effect
                interactionEnabled: false
            });
            
            mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            
            // Hide the original CSS background image once WebGL is ready
            desktopWrapper.style.background = 'transparent';
            
            animate();
        };

        window.addEventListener('resize', onWindowResize);
    };

    const onWindowResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        
        camera.left = -aspect;
        camera.right = aspect;
        camera.updateProjectionMatrix();
        
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        
        if (mesh) {
            mesh.geometry.dispose();
            mesh.geometry = new THREE.PlaneGeometry(2 * aspect, 2);
        }
        
        if (material && material.uniforms) {
            material.uniforms.resolution.value.set(width, height);
        }
    };

    const animate = () => {
        requestAnimationFrame(animate);
        if (material && material.uniforms) {
            material.uniforms.time.value += 0.01;
        }
        renderer.render(scene, camera);
    };

    // 3. Handle Messages for Glitch Control
    window.addEventListener('message', (e) => {
        const data = e.data;
        if (!data || data.type !== 'updateBgGlitchParam' || !material) return;

        const { id, value } = data;
        if (material.uniforms[id]) {
            // Handle specific types if needed (bool, int, etc.)
            if (typeof material.uniforms[id].value === 'boolean') {
                material.uniforms[id].value = (value === true || value === 'true');
            } else if (id === 'interactionShape' || id === 'pixelShape' || id === 'bitDepth' || id === 'dithering') {
                material.uniforms[id].value = parseInt(value);
            } else {
                material.uniforms[id].value = parseFloat(value);
            }
        }
    });

    // Initialize after Three.js is loaded
    if (window.THREE) {
        init();
    } else {
        // Fallback or wait? In index.html we'll load Three.js before this.
        window.addEventListener('load', () => {
            if (window.THREE) init();
        });
    }
})();
