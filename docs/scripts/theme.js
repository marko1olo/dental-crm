/**
 * DENTE Dental CRM — Theme Switcher Engine
 * Supports: Dark (Default), Light, Cyber X-Ray, Ocean, Calm Teal
 * Zero CLS • localStorage Persistence • System Fallback
 */

(function () {
  'use strict';

  var THEMES = {
    'dark': { name: 'Dark Slate', dot: '#2ccab5' },
    'light': { name: 'Light Clinical', dot: '#0d9488' },
    'cyber-xray': { name: 'Cyber X-Ray', dot: '#00f0ff' },
    'ocean': { name: 'Ocean Deep', dot: '#468189' },
    'calm-teal': { name: 'Calm Teal', dot: '#70a9a1' }
  };

  var STORAGE_KEY = 'dente-theme-pref';

  function applyTheme(themeKey) {
    if (!THEMES[themeKey]) themeKey = 'dark';
    document.documentElement.setAttribute('data-theme', themeKey);
    localStorage.setItem(STORAGE_KEY, themeKey);
    syncThemeUi(themeKey);
  }

  function syncThemeUi(themeKey) {
    var labelEl = document.getElementById('currentThemeLabel');
    if (labelEl && THEMES[themeKey]) {
      labelEl.textContent = THEMES[themeKey].name;
    }

    var options = document.querySelectorAll('.theme-opt-btn');
    options.forEach(function (btn) {
      if (btn.getAttribute('data-theme-val') === themeKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  window.applyDenteTheme = applyTheme;

  // Sync automatically if data-theme is set on <html>
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          var current = document.documentElement.getAttribute('data-theme');
          syncThemeUi(current);
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function initTheme() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        saved = 'light';
      } else {
        saved = 'dark';
      }
    }
    applyTheme(saved);

    var triggerBtn = document.getElementById('themeToggleBtn');
    var dropdown = document.getElementById('themeDropdown');

    if (triggerBtn && dropdown) {
      triggerBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = dropdown.classList.contains('open');
        if (isOpen) {
          dropdown.classList.remove('open');
        } else {
          dropdown.classList.add('open');
        }
      });

      document.addEventListener('click', function () {
        dropdown.classList.remove('open');
      });

      dropdown.addEventListener('click', function (e) {
        var opt = e.target.closest('.theme-opt-btn');
        if (opt) {
          var targetTheme = opt.getAttribute('data-theme-val');
          applyTheme(targetTheme);
          dropdown.classList.remove('open');
        }
      });
    }

    // React to system color scheme changes if user hasn't explicitly set preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!localStorage.getItem(STORAGE_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
