/* StyleCraft Theme Engine — shared across all extension pages */
const SC_THEMES = {
  catppuccin: '', // default — no class needed
  dark: 'sc-dark',
  light: 'sc-light'
};

function SC_APPLY_THEME(name) {
  const html = document.documentElement;
  Object.values(SC_THEMES).forEach(cls => { if (cls) html.classList.remove(cls); });
  const cls = SC_THEMES[name];
  if (cls) html.classList.add(cls);
}

// Auto-load theme on page init
(function() {
  chrome.storage.local.get('stylecraft_settings', (d) => {
    const theme = (d.stylecraft_settings || {}).theme || 'catppuccin';
    SC_APPLY_THEME(theme);
    // Set any theme dropdowns to current value
    document.querySelectorAll('.sc-theme-select,[id*=theme]').forEach(el => {
      if (el.tagName === 'SELECT' && el.querySelector('option[value="' + theme + '"]')) {
        el.value = theme;
      }
    });
  });

  // Listen for theme changes from other pages
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'sc-theme-changed' && msg.theme) {
      SC_APPLY_THEME(msg.theme);
      document.querySelectorAll('.sc-theme-select,[id*=theme]').forEach(el => {
        if (el.tagName === 'SELECT' && el.querySelector('option[value="' + msg.theme + '"]')) {
          el.value = msg.theme;
        }
      });
    }
  });
})();
