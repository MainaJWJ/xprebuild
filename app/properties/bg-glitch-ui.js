/**
 * UI Logic for Background GL Glitch tab
 */
window.addEventListener('DOMContentLoaded', () => {
    const sliders = [
        { id: 'gl-intensity', valId: 'val-gl-intensity', param: 'intensity', step: 2 },
        { id: 'gl-pixelSize', valId: 'val-gl-pixelSize', param: 'pixelSize', step: 0 },
        { id: 'gl-curvature', valId: 'val-gl-curvature', param: 'curvature', step: 1 },
        { id: 'gl-rgbShift', valId: 'val-gl-rgbShift', param: 'rgbShift', step: 3 },
        { id: 'gl-digitalNoise', valId: 'val-gl-digitalNoise', param: 'digitalNoise', step: 2 },
        { id: 'gl-lineDisplacement', valId: 'val-gl-lineDisplacement', param: 'lineDisplacement', step: 3 }
    ];

    const checkboxes = [
        { id: 'gl-pixelationEnabled', param: 'pixelationEnabled' },
        { id: 'gl-crtEnabled', param: 'crtEnabled' },
        { id: 'gl-glitchEnabled', param: 'glitchEnabled' }
    ];

    const formatNum = (val, step) => parseFloat(val).toFixed(step);

    // Initialize Sliders
    sliders.forEach(slider => {
        const input = document.getElementById(slider.id);
        const valSpan = document.getElementById(slider.valId);
        
        if (input) {
            input.addEventListener('input', () => {
                if (valSpan) valSpan.textContent = formatNum(input.value, slider.step);
                window.parent.postMessage({ 
                    type: 'updateBgGlitchParam', 
                    id: slider.param, 
                    value: input.value 
                }, '*');
            });
        }
    });

    // Initialize Checkboxes
    checkboxes.forEach(cb => {
        const input = document.getElementById(cb.id);
        if (input) {
            input.addEventListener('change', () => {
                window.parent.postMessage({ 
                    type: 'updateBgGlitchParam', 
                    id: cb.param, 
                    value: input.checked 
                }, '*');
            });
        }
    });
});
