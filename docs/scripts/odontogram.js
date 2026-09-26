/**
 * DENTE Dental CRM — FDI 11..48 Interactive Odontogram Cockpit
 * Adult 32-Teeth Arch • State Machine Cycle • Real-Time Estimate Tally
 * Web Audio Synthetic Feedback • Zero External Assets
 */

(function () {
  'use strict';

  var TEETH_STATES = [
    { key: 'sound', label: 'Здоров', code: 'S', price: 0, icd: null },
    { key: 'caries', label: 'Кариес', code: 'C', price: 3500, icd: 'K02.1' },
    { key: 'restoration', label: 'Пломба', code: 'R', price: 4200, icd: 'Z96.5' },
    { key: 'crown', label: 'Коронка', code: 'K', price: 18000, icd: 'K08.1' },
    { key: 'implant', label: 'Имплантат', code: 'I', price: 38000, icd: 'K08.4' }
  ];

  var UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
  var UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
  var LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
  var LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

  var dentitionState = {};

  // Simple Web Audio Synthesizer for 60 FPS Micro-Haptics
  var audioCtx = null;
  function playClickSound(freq) {
    try {
      if (!audioCtx) {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      if (!audioCtx) return;

      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq || 520, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function getToothSvg() {
    return '<svg class="tooth-icon-svg" viewBox="0 0 24 24"><path d="M12 2C8 2 6 5 6 9c0 4 2 8 3 13 0 .5.5 1 1 1s1-.5 1-1c.5-3 1-5 1-8 0 3 .5 5 1 8 0 .5.5 1 1 1s1-.5 1-1c1-5 3-9 3-13 0-4-2-7-6-7z"/></svg>';
  }

  function formatMoney(num) {
    return num.toLocaleString('ru-RU') + ' ₽';
  }

  function recalculateEstimate() {
    var total = 0;
    var pathologies = 0;
    var soundCount = 0;

    Object.keys(dentitionState).forEach(function (fdi) {
      var stateKey = dentitionState[fdi];
      var stateObj = TEETH_STATES.find(function (s) { return s.key === stateKey; });
      if (stateObj) {
        total += stateObj.price;
        if (stateKey !== 'sound') {
          pathologies++;
        } else {
          soundCount++;
        }
      }
    });

    var totalEl = document.getElementById('cockpitTotalAmount');
    if (totalEl) totalEl.textContent = formatMoney(total);

    var countEl = document.getElementById('cockpitPathologyCount');
    if (countEl) countEl.textContent = pathologies + ' зуб.';

    var soundEl = document.getElementById('cockpitSoundCount');
    if (soundEl) soundEl.textContent = soundCount + ' / 32';
  }

  function updateToothElement(fdi) {
    var el = document.getElementById('tooth-' + fdi);
    if (!el) return;

    var currentState = dentitionState[fdi] || 'sound';
    var stateObj = TEETH_STATES.find(function (s) { return s.key === currentState; });

    TEETH_STATES.forEach(function (s) {
      el.classList.remove('tooth-status-' + s.key);
    });
    el.classList.add('tooth-status-' + currentState);

    var codeEl = el.querySelector('.tooth-status-code');
    if (codeEl) codeEl.textContent = stateObj ? stateObj.code : 'S';

    el.setAttribute('title', 'Зуб FDI ' + fdi + ' — ' + (stateObj ? stateObj.label : 'Здоров'));
  }

  function cycleTooth(fdi) {
    var current = dentitionState[fdi] || 'sound';
    var idx = TEETH_STATES.findIndex(function (s) { return s.key === current; });
    var nextIdx = (idx + 1) % TEETH_STATES.length;
    var nextState = TEETH_STATES[nextIdx];

    dentitionState[fdi] = nextState.key;
    updateToothElement(fdi);
    recalculateEstimate();

    // Haptic feedback pitch shifts based on cost
    var pitch = 440 + (nextIdx * 120);
    playClickSound(pitch);

    var statusInfo = document.getElementById('cockpitSelectedToothInfo');
    if (statusInfo) {
      statusInfo.textContent = 'Зуб FDI ' + fdi + ': ' + nextState.label + (nextState.price > 0 ? ' (' + formatMoney(nextState.price) + ')' : ' [Норма]');
    }
  }

  function renderRow(teethArray, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    teethArray.forEach(function (fdi) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tooth-btn tooth-status-sound';
      btn.id = 'tooth-' + fdi;
      btn.innerHTML = '<span class="tooth-fdi">' + fdi + '</span>' + getToothSvg() + '<span class="tooth-status-code">S</span>';
      btn.addEventListener('click', function () {
        cycleTooth(fdi);
      });
      container.appendChild(btn);
    });
  }

  function applyPreset(presetKey) {
    // Reset all
    [UPPER_RIGHT, UPPER_LEFT, LOWER_RIGHT, LOWER_LEFT].forEach(function (arch) {
      arch.forEach(function (fdi) {
        dentitionState[fdi] = 'sound';
      });
    });

    if (presetKey === 'caries') {
      dentitionState[16] = 'caries';
      dentitionState[25] = 'caries';
      dentitionState[36] = 'caries';
    } else if (presetKey === 'ortho') {
      dentitionState[11] = 'crown';
      dentitionState[21] = 'crown';
      dentitionState[14] = 'restoration';
    } else if (presetKey === 'implant') {
      dentitionState[36] = 'implant';
      dentitionState[46] = 'implant';
      dentitionState[47] = 'crown';
    }

    // Update all elements
    Object.keys(dentitionState).forEach(function (fdi) {
      updateToothElement(fdi);
    });
    recalculateEstimate();
    playClickSound(640);

    var statusInfo = document.getElementById('cockpitSelectedToothInfo');
    if (statusInfo) {
      statusInfo.textContent = 'Применён шаблон: ' + (
        presetKey === 'caries' ? 'Санация (Кариес 16, 25, 36)' :
        presetKey === 'ortho' ? 'Ортопедия (Коронки 11, 21)' :
        presetKey === 'implant' ? 'Имплантация (Зубы 36, 46)' : 'Полная норма'
      );
    }
  }

  function exportEstimateJSON() {
    var activeItems = [];
    var totalCost = 0;

    Object.keys(dentitionState).forEach(function (fdi) {
      var stateKey = dentitionState[fdi];
      if (stateKey !== 'sound') {
        var stateObj = TEETH_STATES.find(function (s) { return s.key === stateKey; });
        if (stateObj) {
          totalCost += stateObj.price;
          activeItems.push({
            toothFdi: parseInt(fdi, 10),
            diagnosis: stateObj.label,
            icd10: stateObj.icd,
            priceRub: stateObj.price
          });
        }
      }
    });

    var payload = {
      clinic: 'DENTE Dental Clinic',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      doctorAutonomy: true,
      mandate8eCompliant: true,
      totalAmountRub: totalCost,
      teethDiagnoses: activeItems
    };

    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'dente-treatment-plan-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function initOdontogram() {
    renderRow(UPPER_RIGHT, 'upperRightArch');
    renderRow(UPPER_LEFT, 'upperLeftArch');
    renderRow(LOWER_RIGHT, 'lowerRightArch');
    renderRow(LOWER_LEFT, 'lowerLeftArch');

    // Initialize all to sound
    [UPPER_RIGHT, UPPER_LEFT, LOWER_RIGHT, LOWER_LEFT].forEach(function (arch) {
      arch.forEach(function (fdi) {
        dentitionState[fdi] = 'sound';
      });
    });

    // Default sample pathology for immediate interactive showcase
    dentitionState[16] = 'caries';
    dentitionState[21] = 'crown';
    dentitionState[36] = 'implant';
    dentitionState[46] = 'restoration';

    Object.keys(dentitionState).forEach(function (fdi) {
      updateToothElement(fdi);
    });
    recalculateEstimate();

    // Preset buttons
    var btnReset = document.getElementById('btnPresetReset');
    if (btnReset) btnReset.addEventListener('click', function () { applyPreset('sound'); });

    var btnCaries = document.getElementById('btnPresetCaries');
    if (btnCaries) btnCaries.addEventListener('click', function () { applyPreset('caries'); });

    var btnOrtho = document.getElementById('btnPresetOrtho');
    if (btnOrtho) btnOrtho.addEventListener('click', function () { applyPreset('ortho'); });

    var btnImplant = document.getElementById('btnPresetImplant');
    if (btnImplant) btnImplant.addEventListener('click', function () { applyPreset('implant'); });

    var btnExport = document.getElementById('btnCockpitExport');
    if (btnExport) btnExport.addEventListener('click', exportEstimateJSON);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOdontogram);
  } else {
    initOdontogram();
  }
})();
