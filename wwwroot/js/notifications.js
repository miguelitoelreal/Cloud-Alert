// Función para mostrar notificación toast
function showNotification(title, message, type = 'info') {
    // Crear contenedor de toast si no existe
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.gap = '10px';
        document.body.appendChild(toastContainer);
    }

    // Definir colores según el tipo
    const colors = {
        'success': { bg: '#10b981', icon: '✓' },
        'error': { bg: '#ef4444', icon: '✕' },
        'info': { bg: '#3b82f6', icon: 'ℹ' },
        'warning': { bg: '#f59e0b', icon: '⚠' }
    };

    const color = colors[type] || colors['info'];

    // Crear elemento toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${color.bg};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 320px;
        animation: slideIn 0.3s ease-out;
        display: flex;
        align-items: flex-start;
        gap: 12px;
    `;

    toast.innerHTML = `
        <span style="font-size: 20px; font-weight: bold; flex-shrink: 0;">${color.icon}</span>
        <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 14px; opacity: 0.9;">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            padding: 0;
            margin-left: auto;
            flex-shrink: 0;
        ">×</button>
    `;

    toastContainer.appendChild(toast);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
