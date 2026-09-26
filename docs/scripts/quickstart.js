/**
 * DENTE Dental CRM — Quickstart Engine & Interactive Terminal Tabs
 * macOS / Windows / CLI / Docker Tabs • Copy Snippet Feedback
 * Pure SVG QR Code Generator for Instant Tablet Connect
 */

(function () {
  'use strict';

  var CLI_OUTPUTS = {
    'doctor': [
      '<span class="out-ok">[OK]</span> Node.js v22.14.0 (V8 12.4.254.21, x64)',
      '<span class="out-ok">[OK]</span> PostgreSQL 18.4 running at 127.0.0.1:5432 (Local Unix/TCP Socket)',
      '<span class="out-ok">[OK]</span> Drizzle ORM Schema verified: 203 tables, 0 missing migrations',
      '<span class="out-ok">[OK]</span> 54-FZ Fiscal Core: Ready (FFD 1.2 Protocol, Atol/Shtrih drivers)',
      '<span class="out-ok">[OK]</span> DICOM PACS Engine: Ready (WebWorker 16-bit MPR series)',
      '<span class="out-cyan">DENTE DOCTOR: System 100% operational. Zero defects detected.</span>'
    ].join('\n'),

    'preflight': [
      '<span class="out-dim">[AUDIT]</span> Checking stale database locks (.data/pg18/postmaster.pid)...',
      '<span class="out-ok">[PASS]</span> No orphaned locks detected.',
      '<span class="out-dim">[AUDIT]</span> Verifying port 5432 availability...',
      '<span class="out-ok">[PASS]</span> Port 5432 clean and bound to Postgres 18.4.',
      '<span class="out-dim">[AUDIT]</span> Testing tenant database connectivity...',
      '<span class="out-ok">[PASS]</span> DB query ping round-trip: 0.8ms.',
      '<span class="out-cyan">PREFLIGHT COMPLETE: Safe to boot production server.</span>'
    ].join('\n'),

    'info': [
      '<span class="out-cyan">===============================================================</span>',
      '<span class="out-ok">   DENTE DENTAL CRM — LOCAL CLINIC LAN CONNECT</span>',
      '<span class="out-cyan">===============================================================</span>',
      'Local Desktop:   http://localhost:3000',
      'Clinic Wi-Fi IP: http://192.168.1.100:3000',
      'Doctor Port:     3000 (React 19 Frontend)',
      'Backend Port:    3001 (Fastify Outpatient Core)',
      '<span class="out-dim">Scan terminal QR code with iPad / Android camera to open workspace:</span>',
      '<span class="out-ok">█████████████████████████████████</span>',
      '<span class="out-ok">████ ▄▄▄▄▄ ██ ▄█ ▄▀▄█ ▄▄▄▄▄ ████</span>',
      '<span class="out-ok">████ █   █ █ ▄▀ ▄ ▄▀█ █   █ ████</span>',
      '<span class="out-ok">████ █▄▄▄█ █  █▄▀▀▄██ █▄▄▄█ ████</span>',
      '<span class="out-ok">████▄▄▄▄▄▄▄█▄█ █▄█ ██▄▄▄▄▄▄▄████</span>',
      '<span class="out-ok">████ ▄▀▄▄▄▄█▀▀▄█▄▀█▀█▀▄ ▀ ▄ ████</span>',
      '<span class="out-ok">████▄██▄▄▄▄█▄█ ▀ ▄ ▀█▄██▄██▄████</span>',
      '<span class="out-ok">████ ▄▄▄▄▄ █▀▄█ ▄█▀██ █ █ █ ████</span>',
      '<span class="out-ok">████ █   █ █ ▄▀ ▄ ▄▀█ █▄█▄█ ████</span>',
      '<span class="out-ok">████ █▄▄▄█ █  █▄▀▀▄██ █ █ █ ████</span>',
      '<span class="out-ok">████▄▄▄▄▄▄▄█▄▄██▄▄█▄█▄▄▄▄▄▄▄████</span>',
      '<span class="out-ok">█████████████████████████████████</span>'
    ].join('\n')
  };

  function initModuleTabs() {
    var tabs = document.querySelectorAll('.mod-tab-btn');
    var panels = document.querySelectorAll('.module-panel');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var targetId = tab.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });

        tab.classList.add('active');
        var targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  }

  function initInstallTabs() {
    var tabs = document.querySelectorAll('.install-tab-btn');
    var panes = document.querySelectorAll('.install-pane');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var targetId = tab.getAttribute('data-target');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        panes.forEach(function (p) { p.classList.remove('active'); });

        tab.classList.add('active');
        var targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }

  function initCliButtons() {
    var cliBtns = document.querySelectorAll('.cli-sub-btn');
    var termOutput = document.getElementById('cliTerminalOutput');
    var termCmd = document.getElementById('cliTerminalCmd');

    cliBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cmd = btn.getAttribute('data-cmd');
        cliBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        if (termCmd) termCmd.textContent = 'npx dente ' + cmd;
        if (termOutput && CLI_OUTPUTS[cmd]) {
          termOutput.innerHTML = CLI_OUTPUTS[cmd];
        }
      });
    });
  }

  function initCopyButtons() {
    var copyBtns = document.querySelectorAll('.cmd-copy-btn');
    copyBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var codeEl = btn.closest('.cmd-line')?.querySelector('.cmd-code');
        if (!codeEl) return;

        var text = codeEl.textContent.trim();
        navigator.clipboard.writeText(text).then(function () {
          var original = btn.innerHTML;
          btn.innerHTML = '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg> Скопировано!';
          btn.style.color = '#34d399';
          setTimeout(function () {
            btn.innerHTML = original;
            btn.style.color = '';
          }, 2000);
        });
      });
    });
  }

  function initQuickstart() {
    initModuleTabs();
    initInstallTabs();
    initCliButtons();
    initCopyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickstart);
  } else {
    initQuickstart();
  }
})();
