export function setupThemeAndLanguage() {
    const langBtn = document.getElementById('lang-toggle-dash');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        let currentLang = document.documentElement.lang === 'es' ? 'en' : 'es';
        document.documentElement.lang = currentLang;
        langBtn.innerText = currentLang === 'es' ? 'EN' : 'ES';
        document.querySelectorAll('[data-es][data-en]').forEach(el => {
          el.innerHTML = el.getAttribute(`data-${currentLang}`) || '';
        });
      });
    }

    const themeBtn = document.getElementById('theme-toggle-dash');
    const updateIcon = () => {
        const isDark = document.documentElement.classList.contains('dark');
        const iconLight = document.getElementById('theme-icon-light-dash');
        const iconDark = document.getElementById('theme-icon-dark-dash');
        if(iconLight) iconLight.classList.toggle('hidden', !isDark);
        if(iconDark) iconDark.classList.toggle('hidden', isDark);
    };
    updateIcon();
    
    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            updateIcon();
        });
    }
}