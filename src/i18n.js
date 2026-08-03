(() => {
  function getMessage(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions) || key;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = getMessage(element.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      element.placeholder = getMessage(element.dataset.i18nPlaceholder);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      element.title = getMessage(element.dataset.i18nTitle);
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
      element.setAttribute('aria-label', getMessage(element.dataset.i18nAriaLabel));
    });

    document.documentElement.lang = getMessage('htmlLang');
  }

  window.memosI18n = {
    getMessage,
    applyTranslations,
    getLocale: () => chrome.i18n.getUILanguage()
  };
})();
