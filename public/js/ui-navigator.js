const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const detectOrientation = () => {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
};

const applyOrientationClass = (container) => {
    const orientation = detectOrientation();

    if (orientation === 'landscape') {
        container.classList.remove('portrait');
        container.classList.add('landscape');
    } else {
        container.classList.remove('landscape');
        container.classList.add('portrait');
    }
};

const applyResponsiveClass = () => {
    const containerClasses = ['.login-container', '.container-background', '.signup-container', '.map-container', '#restaurant-info'];

    containerClasses.forEach(containerClass => {
        const container = document.querySelector(containerClass);

        if (container) {
            if (isMobile()) {
                container.classList.add('mobile');
                applyOrientationClass(container);

                window.addEventListener('resize', () => applyOrientationClass(container));
            } else {
                container.classList.add('desktop');
            }
        }
    });
};

window.addEventListener('load', applyResponsiveClass);