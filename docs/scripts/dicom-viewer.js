/**
 * DENTE Dental CRM — 3D CBCT / DICOM PACS Studio Interactive Simulator
 * HTML5 Canvas Multi-Planar Slice Renderer • HU Probe • Window/Level Presets
 * 60 FPS Zero-Lag Rendering
 */

(function () {
  'use strict';

  var canvas, ctx;
  var currentSlice = 32;
  var totalSlices = 64;
  var windowLevel = 600;
  var windowWidth = 2800;
  var showCrosshair = true;
  var mouseX = 0, mouseY = 0;
  var isHovered = false;

  var HU_PRESETS = {
    'bone': { wl: 600, ww: 2800, name: 'Кость (Bone)' },
    'soft': { wl: 40, ww: 400, name: 'Мягкие ткани (Soft)' },
    'enamel': { wl: 1200, ww: 3200, name: 'Эмаль / Дентин' }
  };

  function calculateHU(x, y, slice) {
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;
    var dx = (x - centerX) / (canvas.width * 0.4);
    var dy = (y - centerY) / (canvas.height * 0.4);
    var dist = Math.sqrt(dx * dx + dy * dy);

    // Simulated anatomical structure
    if (dist > 1.1) return -980; // Air
    if (dist > 0.85) return 40;  // Soft tissue / cheek
    if (dist > 0.65) return 1450 + Math.sin(slice * 0.2) * 200; // Cortical bone
    if (dist > 0.35) {
      // Mandibular / maxillary arch with teeth
      var angle = Math.atan2(dy, dx);
      var toothMod = Math.abs(Math.sin(angle * 8));
      if (toothMod > 0.6) return 2400; // Enamel / Crown
      return 650; // Cancellous bone
    }
    return -600; // Oral cavity / Air
  }

  function renderSlice() {
    if (!canvas || !ctx) return;

    var w = canvas.width;
    var h = canvas.height;
    ctx.fillStyle = '#020609';
    ctx.fillRect(0, 0, w, h);

    // Draw procedural radiologic CT slice
    var cx = w / 2;
    var cy = h / 2;
    var sliceOffset = (currentSlice - 32) * 1.5;

    // Jaw bone arc
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, w * 0.34, h * 0.32 + sliceOffset * 0.3, 0, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    var boneAlpha = Math.min(1, Math.max(0.2, (windowLevel + 1000) / 2500));
    ctx.strokeStyle = 'rgba(210, 240, 255, ' + (0.75 * boneAlpha) + ')';
    ctx.stroke();

    // Cancellous inner trabeculae
    ctx.beginPath();
    ctx.ellipse(cx, cy + 10, w * 0.28, h * 0.26 + sliceOffset * 0.3, 0, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(100, 180, 210, ' + (0.45 * boneAlpha) + ')';
    ctx.stroke();

    // Simulated teeth / implants along the arch
    var teethCount = 14;
    for (var i = 0; i < teethCount; i++) {
      var angle = Math.PI * 0.15 + (i / (teethCount - 1)) * Math.PI * 0.7;
      var rx = w * 0.34 * Math.cos(angle);
      var ry = (h * 0.32 + sliceOffset * 0.3) * Math.sin(angle);
      var tx = cx + rx;
      var ty = cy + 10 + ry;

      ctx.beginPath();
      // Implants at specific positions (e.g. molar index 2 & 11)
      if (i === 2 || i === 11) {
        ctx.fillStyle = '#00f0ff';
        ctx.arc(tx, ty, 6, 0, Math.PI * 2);
        ctx.fill();
        // Radiologic scatter flare
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx - 12, ty - 12, 24, 24);
      } else {
        ctx.fillStyle = 'rgba(240, 250, 255, 0.85)';
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mandibular canal (nerve trace) on lower slices
    if (currentSlice < 36) {
      ctx.beginPath();
      ctx.arc(cx - w * 0.2, cy + 30, 4, 0, Math.PI * 2);
      ctx.arc(cx + w * 0.2, cy + 30, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.fill();
    }

    // Optional crosshairs
    if (showCrosshair && isHovered) {
      ctx.strokeStyle = 'rgba(44, 202, 181, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(mouseX, 0);
      ctx.lineTo(mouseX, h);
      ctx.moveTo(0, mouseY);
      ctx.lineTo(w, mouseY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  function updateHUD() {
    var zCoord = ((currentSlice - 32) * 0.5).toFixed(1);
    var sliceEl = document.getElementById('dicomHudSlice');
    if (sliceEl) {
      sliceEl.textContent = 'СРЕЗ: ' + currentSlice + ' / ' + totalSlices + ' (Z: ' + (zCoord > 0 ? '+' : '') + zCoord + ' мм)';
    }

    var winEl = document.getElementById('dicomHudWindow');
    if (winEl) {
      winEl.textContent = 'WW: ' + windowWidth + ' HU | WL: ' + windowLevel + ' HU';
    }

    var probeEl = document.getElementById('dicomHudProbe');
    if (probeEl) {
      if (isHovered) {
        var hu = Math.round(calculateHU(mouseX, mouseY, currentSlice));
        var tissue = hu > 1200 ? 'Кортикальная кость' : (hu > 400 ? 'Губчатая кость' : (hu > 0 ? 'Мягкие ткани' : 'Воздух'));
        probeEl.textContent = 'ЗОНД: ' + (hu > 0 ? '+' : '') + hu + ' HU (' + tissue + ')';
      } else {
        probeEl.textContent = 'ЗОНД: Наведите курсор на срез';
      }
    }
  }

  function initDicomViewer() {
    canvas = document.getElementById('dicomCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // Resize canvas to internal display pixel ratio
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 640;
    canvas.height = rect.height || 420;

    // Slice Slider
    var sliceSlider = document.getElementById('dicomSliceSlider');
    var sliceValBadge = document.getElementById('dicomSliceVal');
    if (sliceSlider) {
      sliceSlider.addEventListener('input', function (e) {
        currentSlice = parseInt(e.target.value, 10);
        if (sliceValBadge) sliceValBadge.textContent = currentSlice + ' / 64';
        updateHUD();
        renderSlice();
      });
    }

    // Window Level Slider
    var wlSlider = document.getElementById('dicomWlSlider');
    var wlValBadge = document.getElementById('dicomWlVal');
    if (wlSlider) {
      wlSlider.addEventListener('input', function (e) {
        windowLevel = parseInt(e.target.value, 10);
        if (wlValBadge) wlValBadge.textContent = windowLevel + ' HU';
        updateHUD();
        renderSlice();
      });
    }

    // Preset Chips
    var presetChips = document.querySelectorAll('.dicom-preset-btn');
    presetChips.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-preset');
        var p = HU_PRESETS[key];
        if (p) {
          windowLevel = p.wl;
          windowWidth = p.ww;
          if (wlSlider) wlSlider.value = windowLevel;
          if (wlValBadge) wlValBadge.textContent = windowLevel + ' HU';
          presetChips.forEach(function (c) { c.classList.remove('active'); });
          btn.classList.add('active');
          updateHUD();
          renderSlice();
        }
      });
    });

    // Crosshair Toggle
    var crosshairBtn = document.getElementById('btnDicomCrosshair');
    if (crosshairBtn) {
      crosshairBtn.addEventListener('click', function () {
        showCrosshair = !showCrosshair;
        crosshairBtn.classList.toggle('active', showCrosshair);
        renderSlice();
      });
    }

    // Canvas Mouse Listeners
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      mouseY = (e.clientY - r.top) * (canvas.height / r.height);
      isHovered = true;
      updateHUD();
      renderSlice();
    });

    canvas.addEventListener('mouseleave', function () {
      isHovered = false;
      updateHUD();
      renderSlice();
    });

    // Initial draw
    updateHUD();
    renderSlice();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDicomViewer);
  } else {
    initDicomViewer();
  }
})();
