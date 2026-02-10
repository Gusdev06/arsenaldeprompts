// ===== DOM Elements =====
const categoryCards = document.querySelectorAll('.category-card');
const navLinks = document.querySelectorAll('.nav-link');
const toast = document.getElementById('toast');

// ===== Translation Service =====
let translationTimeout;
const TRANSLATION_DELAY = 1000; // 1 segundo de delay para tradução

async function translateText(text, from = 'pt', to = 'en') {
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.responseStatus === 200) {
            return data.responseData.translatedText;
        } else {
            console.error('Translation error:', data);
            return null;
        }
    } catch (error) {
        console.error('Translation API error:', error);
        return null; // Return null on error to handle it in UI
    }
}

// ===== Prompt Card Management =====
class PromptCard {
    constructor(cardElement) {
        this.card = cardElement;
        this.promptId = cardElement.dataset.promptId;
        this.isEditing = false;

        // Elements
        this.editBtn = cardElement.querySelector('.edit-btn');
        this.copyBtn = cardElement.querySelector('.copy-btn');
        this.promptDisplay = cardElement.querySelector('.prompt-display');
        this.promptEdit = cardElement.querySelector('.prompt-edit');
        this.copyEnBtn = cardElement.querySelector('.copy-en-btn');

        this.textareas = {
            pt: cardElement.querySelector('.prompt-textarea[data-lang="pt"]'),
            en: cardElement.querySelector('.prompt-textarea[data-lang="en"]')
        };

        this.init();
    }

    init() {
        // Edit mode
        if (this.editBtn) {
            this.editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEditMode();
            });
        }

        // Copy EN button (main header)
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyEnglish();
            });
        }

        // Copy EN button (inside edit mode)
        if (this.copyEnBtn) {
            this.copyEnBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyEnglish();
            });
        }

        // Real-time translation
        if (this.textareas.pt) {
            this.textareas.pt.addEventListener('input', () => this.handlePtInput());
        }
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;

        if (this.isEditing) {
            this.promptDisplay.classList.add('hidden');
            this.promptEdit.classList.remove('hidden');
            this.editBtn.querySelector('span').textContent = 'Fechar';
            this.editBtn.style.background = '#ef4444';
        } else {
            this.promptDisplay.classList.remove('hidden');
            this.promptEdit.classList.add('hidden');
            this.editBtn.querySelector('span').textContent = 'Editar';
            this.editBtn.style.background = '';
        }
    }

    async handlePtInput() {
        const ptText = this.textareas.pt.value.trim();

        // Clear existing timeout
        if (translationTimeout) {
            clearTimeout(translationTimeout);
        }

        // Set new timeout for translation
        translationTimeout = setTimeout(async () => {
            if (ptText.length > 0) {
                // Show loading indicator
                const enTextarea = this.textareas.en;
                enTextarea.value = 'Traduzindo...';

                // Translate
                const translated = await translateText(ptText, 'pt', 'en');

                if (translated) {
                    enTextarea.value = translated;
                } else {
                    enTextarea.value = 'Erro na tradução. Tente novamente.';
                    showToast('Erro ao traduzir. Limite da API pode ter sido atingido.', 'error');
                }
            }
        }, TRANSLATION_DELAY);
    }

    async copyEnglish() {
        const enText = this.textareas.en ? this.textareas.en.value : '';

        if (!enText || enText === 'Traduzindo...') {
            showToast('Aguarde a tradução finalizar', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(enText);

            // Visual feedback
            const btn = this.isEditing ? this.copyEnBtn : this.copyBtn;
            const originalText = btn.querySelector('span').textContent;

            btn.classList.add('copied');
            btn.querySelector('span').textContent = 'Copiado!';
            showToast('Versão em inglês copiada!');

            setTimeout(() => {
                btn.classList.remove('copied');
                btn.querySelector('span').textContent = originalText;
            }, 2000);

        } catch (err) {
            console.error('Failed to copy:', err);

            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = enText;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();

            try {
                document.execCommand('copy');
                showToast('Versão em inglês copiada!');
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
                showToast('Erro ao copiar', 'error');
            }

            document.body.removeChild(textarea);
        }
    }
}

// ===== Initialize Prompt Cards =====
const promptCards = [];
document.querySelectorAll('.prompt-card').forEach(card => {
    // Only initialize cards with the new structure
    if (card.querySelector('.edit-btn')) {
        promptCards.push(new PromptCard(card));
    }
});

// ===== Legacy Copy Buttons (for old structure) =====
document.querySelectorAll('.copy-btn[data-prompt]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const promptId = btn.dataset.prompt;
        const promptElement = document.getElementById(promptId);

        if (!promptElement) return;

        const text = promptElement.textContent;

        try {
            await navigator.clipboard.writeText(text);

            btn.classList.add('copied');
            btn.querySelector('span').textContent = 'Copiado!';
            showToast();

            setTimeout(() => {
                btn.classList.remove('copied');
                btn.querySelector('span').textContent = 'Copiar';
            }, 2000);

        } catch (err) {
            console.error('Failed to copy:', err);

            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();

            try {
                document.execCommand('copy');
                btn.classList.add('copied');
                btn.querySelector('span').textContent = 'Copiado!';
                showToast();

                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.querySelector('span').textContent = 'Copiar';
                }, 2000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
            }

            document.body.removeChild(textarea);
        }
    });
});

// ===== Category Toggle =====
categoryCards.forEach(card => {
    const header = card.querySelector('.category-header');

    header.addEventListener('click', (e) => {
        // Don't toggle if clicking on buttons inside header
        if (e.target.closest('.copy-btn') || e.target.closest('.edit-btn') || e.target.closest('.lang-btn')) {
            return;
        }

        // Close other cards
        categoryCards.forEach(otherCard => {
            if (otherCard !== card && otherCard.classList.contains('expanded')) {
                otherCard.classList.remove('expanded');
            }
        });

        // Toggle current card
        card.classList.toggle('expanded');
    });
});

// ===== Toast Notification =====
let toastTimeout;

function showToast(message = 'Prompt copiado!', type = 'success') {
    // Clear existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Update message
    toast.querySelector('span').textContent = message;

    // Update color based on type
    if (type === 'success') {
        toast.style.background = '#22c55e';
    } else if (type === 'error') {
        toast.style.background = '#ef4444';
    }

    // Show toast
    toast.classList.add('show');

    // Hide after 2 seconds
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// ===== Navigation Active State =====
function updateActiveNav() {
    const sections = document.querySelectorAll('.section');
    const scrollPos = window.scrollY + 150;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

// Update on scroll
window.addEventListener('scroll', updateActiveNav);

// Smooth scroll for nav links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);

        if (targetSection) {
            const offset = 80; // Account for sticky nav
            const targetPosition = targetSection.offsetTop - offset;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Expand first category by default
    if (categoryCards.length > 0) {
        categoryCards[0].classList.add('expanded');
    }

    // Update active nav on load
    updateActiveNav();
});

// ===== Keyboard Navigation =====
document.addEventListener('keydown', (e) => {
    // Close expanded cards with Escape
    if (e.key === 'Escape') {
        categoryCards.forEach(card => {
            card.classList.remove('expanded');
        });

        // Close edit mode
        promptCards.forEach(card => {
            if (card.isEditing) {
                card.toggleEditMode();
            }
        });
    }
});
