// =========================================================
// js/visualizer.js
// 新手秒懂「噴嘴吐絲、同層撞頭、屋頂拉麵條塌陷」互動小劇場引擎
// 100% 相容原有 index.html / engine.js / app.js
// =========================================================

var VZ_ANIM = {
  rafId: null,
  startTime: 0,
  duration: 6200,      // 正常播放一輪 6.2 秒（含結尾停頓展示）
  slowMo: false,       // 是否開啟 0.5x 慢動作
  paused: false,       // 是否暫停在完成畫面
  progress: 0,         // 0.0 ~ 1.0
  lastDiag: null,
  xyData: null,
  zData: null,
  uiInjected: false
};

// ---------------------------------------------------------
// 自動在 #sec-xray 注入「新手動態大字幕 + 慢動作/重播控制列」
// ---------------------------------------------------------
function ensureVisualizerControls() {
  if (VZ_ANIM.uiInjected) return;
  var xraySec = document.getElementById('sec-xray');
  if (!xraySec) return;
  var gridEl = xraySec.querySelector('.xray-grid');
  if (!gridEl) return;

  var bar = document.createElement('div');
  bar.id = 'vz-theatre-bar';
  bar.style.cssText = [
    'background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    'color: #ffffff',
    'border-radius: 12px',
    'padding: 12px 14px',
    'margin-bottom: 14px',
    'box-shadow: 0 4px 14px rgba(15,23,42,0.18)',
    'border: 1.5px solid #334155'
  ].join(';');

  bar.innerHTML =
    '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
      '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:220px;">' +
        '<span id="vz-stage-pill" style="background:#ea580c;color:#fff;font-size:11.5px;font-weight:900;padding:3px 9px;border-radius:999px;white-space:nowrap;">🎬 步驟 1 / 3</span>' +
        '<span id="vz-stage-text" style="font-size:13.5px;font-weight:800;color:#f8fafc;line-height:1.35;">噴嘴先繞外圈，印出堅固的「橘色外皮牆」...</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
        '<button type="button" id="vz-btn-replay" onclick="vzReplay()" style="background:#2563eb;color:#fff;border:none;border-radius:7px;padding:5px 10px;font-size:11.5px;font-weight:800;cursor:pointer;">🔄 重新播放列印過程</button>' +
        '<button type="button" id="vz-btn-slow" onclick="vzToggleSlow()" style="background:#334155;color:#e2e8f0;border:1px solid #475569;border-radius:7px;padding:5px 10px;font-size:11.5px;font-weight:800;cursor:pointer;">🐢 0.5x 慢動作看細節</button>' +
        '<button type="button" id="vz-btn-pause" onclick="vzTogglePause()" style="background:#334155;color:#e2e8f0;border:1px solid #475569;border-radius:7px;padding:5px 10px;font-size:11.5px;font-weight:800;cursor:pointer;">⏸ 定格看全圖</button>' +
      '</div>' +
    '</div>' +
    '<div style="width:100%;height:7px;background:#334155;border-radius:999px;overflow:hidden;position:relative;">' +
      '<div id="vz-progress-fill" style="width:0%;height:100%;background:linear-gradient(90deg,#f97316 0%,#ef4444 55%,#38bdf8 100%);transition:width 0.06s linear;"></div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;font-size:10.5px;color:#94a3b8;margin-top:4px;font-weight:700;">' +
      '<span>① 先印橘色外牆 (0~25%)</span>' +
      '<span>② 再印肚子紅色支架 (25~65%)</span>' +
      '<span>③ 最後拉線蓋藍色屋頂 (65~100%)</span>' +
    '</div>';

  xraySec.insertBefore(bar, gridEl);
  VZ_ANIM.uiInjected = true;
}

// 全域控制函式：重播
function vzReplay() {
  VZ_ANIM.paused = false;
  var pauseBtn = document.getElementById('vz-btn-pause');
  if (pauseBtn) {
    pauseBtn.textContent = '⏸ 定格看全圖';
    pauseBtn.style.background = '#334155';
  }
  VZ_ANIM.startTime = performance.now();
  startVzLoop();
}

// 全域控制函式：切換 0.5x 慢動作
function vzToggleSlow() {
  VZ_ANIM.slowMo = !VZ_ANIM.slowMo;
  var slowBtn = document.getElementById('vz-btn-slow');
  if (slowBtn) {
    if (VZ_ANIM.slowMo) {
      slowBtn.textContent = '⚡ 恢復正常速度 (目前 0.5x 慢動作)';
      slowBtn.style.background = '#d97706';
      slowBtn.style.borderColor = '#fbbf24';
    } else {
      slowBtn.textContent = '🐢 0.5x 慢動作看細節';
      slowBtn.style.background = '#334155';
      slowBtn.style.borderColor = '#475569';
    }
  }
  VZ_ANIM.startTime = performance.now() - VZ_ANIM.progress * getEffectiveDuration();
  if (VZ_ANIM.paused) vzReplay();
}

// 全域控制函式：定格在 100% 完成畫面或繼續播放
function vzTogglePause() {
  VZ_ANIM.paused = !VZ_ANIM.paused;
  var pauseBtn = document.getElementById('vz-btn-pause');
  if (VZ_ANIM.paused) {
    if (pauseBtn) {
      pauseBtn.textContent = '▶️ 繼續播放動畫';
      pauseBtn.style.background = '#16a34a';
    }
    renderFrameAt(0.95);
  } else {
    if (pauseBtn) {
      pauseBtn.textContent = '⏸ 定格看全圖';
      pauseBtn.style.background = '#334155';
    }
    VZ_ANIM.startTime = performance.now();
    startVzLoop();
  }
}

function getEffectiveDuration() {
  return VZ_ANIM.slowMo ? VZ_ANIM.duration * 2.0 : VZ_ANIM.duration;
}

function startVzLoop() {
  if (VZ_ANIM.rafId) cancelAnimationFrame(VZ_ANIM.rafId);
  function tick(now) {
    if (VZ_ANIM.paused) return;
    if (!VZ_ANIM.startTime) VZ_ANIM.startTime = now;
    var elapsed = now - VZ_ANIM.startTime;
    var dur = getEffectiveDuration();
    var p = (elapsed % dur) / dur;
    VZ_ANIM.progress = p;
    renderFrameAt(p);
    VZ_ANIM.rafId = requestAnimationFrame(tick);
  }
  VZ_ANIM.rafId = requestAnimationFrame(tick);
}

// =========================================================
// 7. 準備左圖 (XY 俯視切片圖) 幾何與噴嘴真實走線軌跡
// =========================================================
function drawCartoonXY(diag) {
  ensureVisualizerControls();
  VZ_ANIM.lastDiag = diag;

  var clipRect = document.getElementById('xy-clip-rect');
  var badge = document.getElementById('xy-status-badge');
  var layerTxt = document.getElementById('layer-indicator-text');
  var caption = document.getElementById('xy-caption');

  var isOddLayer = (state.previewLayer === 15);
  if (layerTxt) {
    layerTxt.textContent = isOddLayer
      ? '👀 目前預覽：奇數層 (第 15 層) 噴頭走線'
      : '👀 目前預覽：偶數層 (第 16 層) 噴頭走線';
  }

  var bx = 22, by = 14, bw = 316, bh = 196, stepW = 5.0;
  var pad = state.walls * stepW + 2;
  var ix = Math.round(bx + pad);
  var iy = Math.round(by + pad);
  var iw = Math.round(bw - pad * 2);
  var ih = Math.round(bh - pad * 2);
  var iright = ix + iw;
  var ibottom = iy + ih;

  if (clipRect) {
    clipRect.setAttribute('x', ix);
    clipRect.setAttribute('y', iy);
    clipRect.setAttribute('width', iw);
    clipRect.setAttribute('height', ih);
    clipRect.setAttribute('rx', Math.max(2, 10 - state.walls * 2));
  }

  // 建立噴嘴在內部空腔的「分段吐絲路徑 segments」與「交叉撞擊點 collisions」
  var count = Math.max(2, Math.min(8, Math.round(state.density / 5) + 1));
  var sx = iw / (count + 1);
  var sy = ih / (count + 1);

  var segments = [];   // 每個元素: { points: [[x,y], ...], color, width, dash }
  var collisions = []; // 每個元素: { x, y, triggerAtSegIndex, isSevere }
  var staticBgHtml = '';
  var summaryBannerHtml = '';

  if (state.pattern === 'grid') {
    // 先畫所有橫線 (不撞)，再畫所有直線 (每經過一條橫線就撞一次！)
    var hYs = [];
    for (var i = 1; i <= count; i++) {
      var cy = Math.round(iy + i * sy);
      hYs.push(cy);
      var fromLeft = (i % 2 === 1);
      segments.push({
        points: fromLeft ? [[ix, cy], [iright, cy]] : [[iright, cy], [ix, cy]],
        color: '#dc2626',
        width: 2.6
      });
    }
    for (var gx = 1; gx <= count; gx++) {
      var cx = Math.round(ix + gx * sx);
      var segIdx = segments.length;
      segments.push({
        points: [[cx, iy], [cx, ibottom]],
        color: '#dc2626',
        width: 2.6
      });
      for (var gy = 0; gy < hYs.length; gy++) {
        collisions.push({
          x: cx,
          y: hYs[gy],
          segIdx: segIdx,
          segFrac: (hYs[gy] - iy) / ih,
          isSevere: diag.isCrossCollision
        });
      }
    }
    if (diag.isCrossCollision) {
      summaryBannerHtml =
        '<rect x="52" y="' + (iy + 6) + '" width="256" height="24" rx="6" fill="rgba(220,38,38,0.95)" />' +
        '<text x="180" y="' + (iy + 22) + '" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">💥 同層十字相撞點（PETG 必結瘤刮噴嘴！）</text>';
    } else {
      summaryBannerHtml =
        '<rect x="64" y="' + (iy + 6) + '" width="232" height="23" rx="6" fill="rgba(21,128,61,0.92)" />' +
        '<text x="180" y="' + (iy + 21) + '" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">✅ 井字支撐穩固（PLA 不怕微小交叉）</text>';
    }
  } else if (state.pattern === 'line') {
    var lCount = count + 2;
    if (isOddLayer) {
      // 淡色虛線代表下一層/上一層正交方向，凸顯「隔層才轉向」
      for (var bgL = 1; bgL <= lCount; bgL++) {
        var bgX = Math.round(ix + (iw / (lCount + 1)) * bgL);
        staticBgHtml += '<line x1="' + bgX + '" y1="' + iy + '" x2="' + bgX + '" y2="' + ibottom + '" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4" />';
      }
      for (var l1 = 1; l1 <= lCount; l1++) {
        var ly = Math.round(iy + (ih / (lCount + 1)) * l1);
        var dir = (l1 % 2 === 1);
        segments.push({
          points: dir ? [[ix, ly], [iright, ly]] : [[iright, ly], [ix, ly]],
          color: '#dc2626',
          width: 2.8
        });
      }
    } else {
      for (var bgY = 1; bgY <= lCount; bgY++) {
        var byLine = Math.round(iy + (ih / (lCount + 1)) * bgY);
        staticBgHtml += '<line x1="' + ix + '" y1="' + byLine + '" x2="' + iright + '" y2="' + byLine + '" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4" />';
      }
      for (var l2 = 1; l2 <= lCount; l2++) {
        var lx = Math.round(ix + (iw / (lCount + 1)) * l2);
        var dir2 = (l2 % 2 === 1);
        segments.push({
          points: dir2 ? [[lx, iy], [lx, ibottom]] : [[lx, ibottom], [lx, iy]],
          color: '#dc2626',
          width: 2.8
        });
      }
    }
    summaryBannerHtml =
      '<rect x="52" y="' + (iy + 6) + '" width="256" height="24" rx="6" fill="rgba(22,163,74,0.94)" />' +
      '<text x="180" y="' + (iy + 22) + '" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">' +
      (isOddLayer ? '✅ 第15層：單向平行橫線（同層 0 交叉點！）' : '✅ 第16層：換方向畫直線（隔層搭橋不撞頭！）') + '</text>';
  } else if (state.pattern === 'gyroid') {
    var rows = Math.max(2, count);
    var rGap = ih / (rows + 1);
    var flip = isOddLayer ? 1 : -1;
    for (var r = 1; r <= rows; r++) {
      var wy = Math.round(iy + r * rGap);
      var amp = Math.min(15, Math.round(rGap * 0.42));
      var pts = [];
      var sampleN = 28;
      var goRight = (r % 2 === 1);
      for (var s = 0; s <= sampleN; s++) {
        var t = goRight ? (s / sampleN) : (1 - s / sampleN);
        var px = Math.round(ix + t * iw);
        var py = Math.round(wy + Math.sin(t * Math.PI * 3) * amp * flip);
        pts.push([px, py]);
      }
      segments.push({ points: pts, color: '#dc2626', width: 2.8 });
    }
    summaryBannerHtml =
      '<rect x="56" y="' + (iy + 6) + '" width="248" height="24" rx="6" fill="rgba(22,163,74,0.93)" />' +
      '<text x="180" y="' + (iy + 22) + '" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">🌊 S型波浪連續滑行・同層絕不擦撞！</text>';
  } else if (state.pattern === 'adaptive') {
    var mx = Math.round(ix + iw / 2);
    var my = Math.round(iy + ih / 2);
    var q1x = Math.round(ix + iw * 0.23);
    var q3x = Math.round(ix + iw * 0.77);
    var q1y = Math.round(iy + ih * 0.25);
    var q3y = Math.round(iy + ih * 0.75);

    staticBgHtml += '<rect x="' + (q1x + 2) + '" y="' + (q1y + 2) + '" width="' + (q3x - q1x - 4) + '" height="' + (q3y - q1y - 4) + '" fill="#fefce8" stroke="#fde047" stroke-width="1.5" />';

    // 4 條外環主幹
    segments.push({ points: [[q1x, iy], [q1x, ibottom]], color: '#dc2626', width: 2.4 });
    segments.push({ points: [[q3x, iy], [q3x, ibottom]], color: '#dc2626', width: 2.4 });
    segments.push({ points: [[ix, q1y], [iright, q1y]], color: '#dc2626', width: 2.4 });
    segments.push({ points: [[ix, q3y], [iright, q3y]], color: '#dc2626', width: 2.4 });

    // 四周貼牆 2倍加密短肋條
    var subN = 8;
    for (var st = 1; st < subN; st++) {
      var sxTop = Math.round(ix + (iw / subN) * st);
      var sySide = Math.round(iy + (ih / subN) * st);
      segments.push({ points: [[sxTop, iy], [sxTop, q1y]], color: '#dc2626', width: 2.0 });
      segments.push({ points: [[sxTop, q3y], [sxTop, ibottom]], color: '#dc2626', width: 2.0 });
      segments.push({ points: [[ix, sySide], [q1x, sySide]], color: '#dc2626', width: 2.0 });
      segments.push({ points: [[q3x, sySide], [iright, sySide]], color: '#dc2626', width: 2.0 });
    }
    summaryBannerHtml =
      '<rect x="' + (mx - 84) + '" y="' + (my - 12) + '" width="168" height="24" rx="6" fill="rgba(15,23,42,0.9)" />' +
      '<text x="' + mx + '" y="' + (my + 4) + '" text-anchor="middle" font-size="11" fill="#fde047" font-weight="bold">🎯 中心大空腔省料・貼牆2倍加密</text>';
  } else if (state.pattern === 'lightning') {
    var reach = isOddLayer ? 0.26 : 0.33;
    var dW = Math.round(iw * reach);
    segments.push({
      points: [
        [ix, Math.round(iy + ih * 0.25)],
        [ix + Math.round(dW * 0.6), Math.round(iy + ih * 0.35)],
        [ix + dW, Math.round(iy + ih * 0.22)]
      ],
      color: '#dc2626', width: 2.8
    });
    segments.push({
      points: [
        [ix + Math.round(dW * 0.6), Math.round(iy + ih * 0.35)],
        [ix + Math.round(dW * 0.92), Math.round(iy + ih * 0.50)]
      ],
      color: '#dc2626', width: 2.4
    });
    segments.push({
      points: [
        [ix, Math.round(iy + ih * 0.75)],
        [ix + Math.round(dW * 0.65), Math.round(iy + ih * 0.66)],
        [ix + dW, Math.round(iy + ih * 0.80)]
      ],
      color: '#dc2626', width: 2.8
    });
    segments.push({
      points: [
        [iright, Math.round(iy + ih * 0.30)],
        [iright - Math.round(dW * 0.6), Math.round(iy + ih * 0.38)],
        [iright - dW, Math.round(iy + ih * 0.24)]
      ],
      color: '#dc2626', width: 2.8
    });
    segments.push({
      points: [
        [iright, Math.round(iy + ih * 0.76)],
        [iright - Math.round(dW * 0.65), Math.round(iy + ih * 0.68)],
        [iright - dW, Math.round(iy + ih * 0.82)]
      ],
      color: '#dc2626', width: 2.8
    });
    summaryBannerHtml =
      '<rect x="74" y="96" width="212" height="25" rx="6" fill="rgba(15,23,42,0.9)" />' +
      '<text x="180" y="113" text-anchor="middle" font-size="11" fill="#fde047" font-weight="bold">⚡ 肚子中心全空・只從牆邊長閃電枝</text>';
  } else if (state.pattern === 'cubic') {
    var shift = isOddLayer ? 0 : 10;
    for (var c = 1; c <= count; c++) {
      var cy2 = Math.round(iy + c * sy + shift * 0.3);
      segments.push({ points: [[ix, cy2], [iright, cy2]], color: '#dc2626', width: 2.5 });
    }
    var stepC = Math.round(iw / Math.max(2, count));
    for (var dx = 0; dx <= iw; dx += stepC) {
      var sIdx = segments.length;
      var xStart = ix + dx;
      var xEnd = Math.max(ix, xStart - ih * 0.7);
      segments.push({ points: [[xStart, iy], [xEnd, ibottom]], color: '#dc2626', width: 2.5 });
      collisions.push({
        x: Math.round((xStart + xEnd) / 2),
        y: Math.round(iy + ih * 0.5),
        segIdx: sIdx,
        segFrac: 0.5,
        isSevere: diag.isCrossCollision
      });
    }
    if (diag.isCrossCollision) {
      summaryBannerHtml =
        '<rect x="56" y="' + (iy + 6) + '" width="248" height="24" rx="6" fill="rgba(220,38,38,0.95)" />' +
        '<text x="180" y="' + (iy + 22) + '" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">💥 同層三向交叉點（PETG 易結瘤刮頭）</text>';
    }
  } else {
    // 蜂窩與交叉層疊：密集鋸齒轉折
    var hRows = Math.max(3, count);
    var hGap = ih / (hRows + 1);
    var phaseShift = isOddLayer ? 1 : -1;
    for (var hr = 1; hr <= hRows; hr++) {
      var hy = Math.round(iy + hr * hGap);
      var ptsH = [[ix, hy]];
      var steps = 12;
      var sw = iw / steps;
      for (var st2 = 1; st2 <= steps; st2++) {
        var sx2 = Math.round(ix + st2 * sw);
        var sy2 = hy + ((st2 % 2 === 0) ? (8 * phaseShift) : (-8 * phaseShift));
        ptsH.push([sx2, sy2]);
      }
      segments.push({ points: ptsH, color: '#dc2626', width: 2.5 });
    }
    summaryBannerHtml =
      '<rect x="70" y="96" width="220" height="25" rx="6" fill="rgba(185,28,28,0.93)" />' +
      '<text x="180" y="113" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">🐢 轉折過多頻繁急煞・耗時又費料</text>';
  }

  // 更新左圖文字說明與狀態徽章
  if (diag.isCrossCollision) {
    badge.style.color = '#dc2626';
    badge.textContent = '🚨 紅點同層相撞刮噴嘴！';
    caption.innerHTML = '<strong style="color:#dc2626;">仔細看動畫第 2 步：</strong>噴嘴先畫橫線、再畫直線直接<strong>硬撞剛印好的塑膠線</strong>（紅圈爆炸處），PETG 必結瘤發出異音！請改選「📏 直線」或「🌀 螺旋體」。';
  } else if (PATTERN_INFO[state.pattern].hasCross) {
    badge.style.color = '#15803d';
    badge.textContent = '✅ 井字支撐（PLA 適用）';
    caption.innerHTML = '外圈為 <strong>' + state.walls + ' 圈橘色外牆</strong>，內部井字交點可提供極穩的平頂支撐（PLA 印收納盒首選）。';
  } else {
    badge.style.color = '#15803d';
    badge.textContent = '✅ 同層零交叉（絕不刮噴嘴）';
    caption.innerHTML = '請看噴嘴軌跡：每一條紅線都<strong>不會在同平面十字硬撞</strong>，可點上方藍色按鈕切換第 15 / 16 層觀察！';
  }

  VZ_ANIM.xyData = {
    bx: bx, by: by, bw: bw, bh: bh, stepW: stepW,
    ix: ix, iy: iy, iw: iw, ih: ih, iright: iright, ibottom: ibottom,
    segments: segments,
    collisions: collisions,
    staticBgHtml: staticBgHtml,
    summaryBannerHtml: summaryBannerHtml,
    diag: diag
  };
}

// =========================================================
// 8. 準備右圖 (Z 軸側面剖面圖) 幾何、支撐綠點與屋頂塌陷軌跡
// =========================================================
function drawCartoonZ(diag) {
  ensureVisualizerControls();
  VZ_ANIM.lastDiag = diag;

  var clipRect = document.getElementById('z-clip-rect');
  var badge = document.getElementById('z-status-badge');
  var caption = document.getElementById('z-caption');

  var outerLeft = 24;
  var outerRight = 336;
  var roofTopY = 52;
  var roofUndersideY = 70;
  var bottomSolidTopY = 190;
  var bedTopY = 202;
  var cavityH = bottomSolidTopY - roofUndersideY; // 120px

  var loopW = 4.5;
  var totalWallW = state.walls * loopW;
  var inLeft = Math.round(outerLeft + totalWallW);
  var inRight = Math.round(outerRight - totalWallW);
  var innerSpan = inRight - inLeft;

  if (clipRect) {
    clipRect.setAttribute('x', inLeft);
    clipRect.setAttribute('y', roofUndersideY);
    clipRect.setAttribute('width', innerSpan);
    clipRect.setAttribute('height', cavityH);
  }

  var contactXs = [];
  var pHtml = '';
  var extraAnnHtml = '';

  if (state.pattern === 'grid' || state.pattern === 'line') {
    var ribCount = Math.max(4, Math.min(11, Math.round(state.density / 3.2) + 2));
    var stepX = innerSpan / (ribCount + 1);
    for (var i = 1; i <= ribCount; i++) {
      var px = Math.round(inLeft + i * stepX);
      contactXs.push(px);
      pHtml += '<line x1="' + px + '" y1="' + bottomSolidTopY + '" x2="' + px + '" y2="' + roofUndersideY + '" stroke="#dc2626" stroke-width="3" />';
      if (state.pattern === 'line' && i < ribCount) {
        var nextPx = Math.round(inLeft + (i + 1) * stepX);
        for (var ly = roofUndersideY + 16; ly < bottomSolidTopY - 10; ly += 24) {
          pHtml += '<line x1="' + px + '" y1="' + ly + '" x2="' + nextPx + '" y2="' + ly + '" stroke="#fca5a5" stroke-width="1.8" stroke-dasharray="4,3" />';
        }
      }
    }
  } else if (state.pattern === 'gyroid') {
    var crestCount = (state.density <= 8) ? 2 : Math.max(4, Math.min(9, Math.round(state.density / 3)));
    var halfCycles = crestCount * 2 + 1;
    var dxWave = innerSpan / halfCycles;
    var midY = Math.round(roofUndersideY + cavityH * 0.5);

    var waveD = 'M ' + inLeft + ' ' + bottomSolidTopY;
    var subWaveD = 'M ' + inLeft + ' ' + midY;
    for (var h = 0; h < halfCycles; h++) {
      var xStart = inLeft + h * dxWave;
      var xMid = Math.round(xStart + dxWave * 0.5);
      var xEnd = Math.round(xStart + dxWave);
      if (h % 2 === 0) {
        waveD += ' C ' + Math.round(xStart + dxWave * 0.2) + ' ' + (roofUndersideY + 28) + ', ' + (xMid - 8) + ' ' + roofUndersideY + ', ' + xMid + ' ' + roofUndersideY;
        waveD += ' C ' + (xMid + 8) + ' ' + roofUndersideY + ', ' + Math.round(xEnd - dxWave * 0.2) + ' ' + (roofUndersideY + 28) + ', ' + xEnd + ' ' + bottomSolidTopY;
        contactXs.push(xMid);
      }
      subWaveD += ' Q ' + xMid + ' ' + ((h % 2 === 0) ? (bottomSolidTopY - 10) : (roofUndersideY + 14)) + ', ' + xEnd + ' ' + midY;
    }
    pHtml += '<path d="' + subWaveD + '" fill="none" stroke="#fca5a5" stroke-width="1.8" stroke-dasharray="4,3" />';
    pHtml += '<path d="' + waveD + '" fill="none" stroke="#dc2626" stroke-width="3" />';

    if (state.density <= 8 && contactXs.length === 2) {
      var gapLeft = contactXs[0];
      var gapRight = contactXs[1];
      var gapCenter = Math.round((gapLeft + gapRight) / 2);
      extraAnnHtml += '<line x1="' + (gapLeft + 6) + '" y1="96" x2="' + (gapRight - 6) + '" y2="96" stroke="#dc2626" stroke-width="2" stroke-dasharray="3,3" />' +
        '<rect x="' + (gapCenter - 66) + '" y="102" width="132" height="20" rx="5" fill="rgba(220,38,38,0.94)" />' +
        '<text x="' + gapCenter + '" y="116" text-anchor="middle" font-size="10.5" fill="#ffffff" font-weight="bold">↔ 綠點隔太遠・中間懸空！</text>';
    }
  } else if (state.pattern === 'adaptive') {
    var ySplit1 = Math.round(roofUndersideY + cavityH * 0.54);
    var ySplit2 = Math.round(roofUndersideY + cavityH * 0.24);
    var roots = [
      Math.round(inLeft + innerSpan * 0.24),
      Math.round(inLeft + innerSpan * 0.76)
    ];

    for (var rIdx = 0; rIdx < roots.length; rIdx++) {
      var rxNode = roots[rIdx];
      var wallX = (rIdx === 0) ? inLeft : inRight;
      pHtml += '<line x1="' + rxNode + '" y1="' + bottomSolidTopY + '" x2="' + rxNode + '" y2="' + ySplit1 + '" stroke="#dc2626" stroke-width="3.2" />';
      pHtml += '<line x1="' + wallX + '" y1="' + (bottomSolidTopY - 14) + '" x2="' + rxNode + '" y2="' + ySplit1 + '" stroke="#dc2626" stroke-width="2.5" />';

      var off1 = Math.round(innerSpan * 0.13);
      var mNodes = [rxNode - off1, rxNode + off1];
      for (var m = 0; m < mNodes.length; m++) {
        var mxNode = mNodes[m];
        pHtml += '<line x1="' + rxNode + '" y1="' + ySplit1 + '" x2="' + mxNode + '" y2="' + ySplit2 + '" stroke="#dc2626" stroke-width="2.6" />';

        var off2 = Math.round(innerSpan * 0.055);
        var t1 = mxNode - off2;
        var t2 = mxNode + off2;
        pHtml += '<line x1="' + mxNode + '" y1="' + ySplit2 + '" x2="' + t1 + '" y2="' + roofUndersideY + '" stroke="#dc2626" stroke-width="2.2" />';
        pHtml += '<line x1="' + mxNode + '" y1="' + ySplit2 + '" x2="' + t2 + '" y2="' + roofUndersideY + '" stroke="#dc2626" stroke-width="2.2" />';
        contactXs.push(t1, t2);
      }
    }
    var midCavityX = Math.round(inLeft + innerSpan * 0.5);
    extraAnnHtml += '<rect x="' + (midCavityX - 72) + '" y="' + (bottomSolidTopY - 30) + '" width="144" height="21" rx="5" fill="rgba(15,23,42,0.88)" />' +
      '<text x="' + midCavityX + '" y="' + (bottomSolidTopY - 16) + '" text-anchor="middle" font-size="10.5" fill="#fde047" font-weight="bold">🎯 下空省料・上密分叉撐屋頂</text>';
  } else if (state.pattern === 'lightning') {
    var lt1 = Math.round(inLeft + innerSpan * 0.13);
    var lt2 = Math.round(inLeft + innerSpan * 0.24);
    var rt1 = Math.round(inRight - innerSpan * 0.24);
    var rt2 = Math.round(inRight - innerSpan * 0.13);

    var lKneeX = Math.round(inLeft + innerSpan * 0.11);
    var lKneeY = Math.round(roofUndersideY + cavityH * 0.36);
    pHtml += '<path d="M ' + inLeft + ' ' + Math.round(roofUndersideY + cavityH * 0.72) + ' L ' + lKneeX + ' ' + lKneeY + ' L ' + lt1 + ' ' + roofUndersideY + '" fill="none" stroke="#dc2626" stroke-width="2.8" />';
    pHtml += '<path d="M ' + lKneeX + ' ' + lKneeY + ' L ' + (lKneeX + 10) + ' ' + (lKneeY - 14) + ' L ' + lt2 + ' ' + roofUndersideY + '" fill="none" stroke="#dc2626" stroke-width="2.4" />';

    var rKneeX = Math.round(inRight - innerSpan * 0.11);
    var rKneeY = Math.round(roofUndersideY + cavityH * 0.36);
    pHtml += '<path d="M ' + inRight + ' ' + Math.round(roofUndersideY + cavityH * 0.72) + ' L ' + rKneeX + ' ' + rKneeY + ' L ' + rt2 + ' ' + roofUndersideY + '" fill="none" stroke="#dc2626" stroke-width="2.8" />';
    pHtml += '<path d="M ' + rKneeX + ' ' + rKneeY + ' L ' + (rKneeX - 10) + ' ' + (rKneeY - 14) + ' L ' + rt1 + ' ' + roofUndersideY + '" fill="none" stroke="#dc2626" stroke-width="2.4" />';

    contactXs.push(lt1, lt2, rt1, rt2);

    var midX2 = Math.round(inLeft + innerSpan * 0.5);
    extraAnnHtml += '<rect x="' + (midX2 - 76) + '" y="' + (bottomSolidTopY - 30) + '" width="152" height="21" rx="5" fill="rgba(15,23,42,0.88)" />' +
      '<text x="' + midX2 + '" y="' + (bottomSolidTopY - 16) + '" text-anchor="middle" font-size="10.5" fill="#fde047" font-weight="bold">⚡ 中心全空・僅靠牆長閃電枝</text>';
  } else {
    var bayCount = Math.max(3, Math.min(7, Math.round(state.density / 4.5) + 2));
    var bayW = innerSpan / bayCount;
    for (var k = 0; k < bayCount; k++) {
      var xA = Math.round(inLeft + k * bayW);
      var xB = Math.round(inLeft + (k + 1) * bayW);
      var xM = Math.round((xA + xB) / 2);
      var yM = Math.round(roofUndersideY + cavityH * 0.5);
      pHtml += '<line x1="' + xA + '" y1="' + bottomSolidTopY + '" x2="' + xB + '" y2="' + roofUndersideY + '" stroke="#dc2626" stroke-width="2.5" />';
      pHtml += '<line x1="' + xB + '" y1="' + bottomSolidTopY + '" x2="' + xA + '" y2="' + roofUndersideY + '" stroke="#dc2626" stroke-width="2.5" />';
      pHtml += '<line x1="' + xM + '" y1="' + yM + '" x2="' + xM + '" y2="' + roofUndersideY + '" stroke="#dc2626" stroke-width="2.4" />';
      contactXs.push(xM);
      if (k > 0) contactXs.push(xA);
    }
  }

  contactXs.sort(function(a, b) { return a - b; });
  var supports = [inLeft];
  for (var sIdx = 0; sIdx < contactXs.length; sIdx++) {
    var pt = contactXs[sIdx];
    if (pt > inLeft + 4 && pt < inRight - 4) {
      if (pt - supports[supports.length - 1] > 4) {
        supports.push(pt);
      }
    }
  }
  supports.push(inRight);

  // 檢查是否有超過 56px 的無支撐大跨距且處於塌陷警報狀態
  var hasSagSpan = false;
  var sagGapInfo = null;
  for (var seg = 0; seg < supports.length - 1; seg++) {
    var sx1 = supports[seg];
    var sx2 = supports[seg + 1];
    var spanW = sx2 - sx1;
    if (diag.isRoofSagging && spanW > 56) {
      hasSagSpan = true;
      sagGapInfo = { sx1: sx1, sx2: sx2, midX: Math.round((sx1 + sx2) / 2), spanW: spanW };
    }
  }

  var roofLayers = state.topLayers || 4;
  if (hasSagSpan) {
    badge.style.color = '#dc2626';
    badge.textContent = '🚨 支撐太遠・屋頂下垂凹陷！';
    caption.innerHTML = '<strong style="color:#dc2626;">請看第 3 步蓋屋頂動畫：</strong>當噴嘴拉線經過中間大空洞時，因為底下沒有<strong>🟢綠點</strong>托住，熱塑膠直接像軟麵條一樣往下垂墜滴落，害頂面凹出大坑洞！';
  } else {
    badge.style.color = '#15803d';
    badge.textContent = '✅ 屋頂平整無塌陷';
    caption.innerHTML = '<strong>請看第 3 步蓋屋頂動畫：</strong>噴嘴從左往右拉線時，底下每一顆<strong>🟢綠色支撐點</strong>都像橋墩一樣及時托住熱塑膠，鋪出筆直平整的 ' + roofLayers + ' 層藍色屋頂！';
  }

  VZ_ANIM.zData = {
    outerLeft: outerLeft, outerRight: outerRight,
    roofTopY: roofTopY, roofUndersideY: roofUndersideY,
    bottomSolidTopY: bottomSolidTopY, bedTopY: bedTopY,
    cavityH: cavityH, loopW: loopW,
    inLeft: inLeft, inRight: inRight, innerSpan: innerSpan,
    pHtml: pHtml,
    extraAnnHtml: extraAnnHtml,
    supports: supports,
    hasSagSpan: hasSagSpan,
    sagGapInfo: sagGapInfo,
    roofLayers: roofLayers,
    diag: diag
  };

  // 每次切換參數或模式時，自動從頭播放一次完整列印過程
  VZ_ANIM.paused = false;
  var pauseBtn = document.getElementById('vz-btn-pause');
  if (pauseBtn) {
    pauseBtn.textContent = '⏸ 定格看全圖';
    pauseBtn.style.background = '#334155';
  }
  VZ_ANIM.startTime = performance.now();
  startVzLoop();
}

// =========================================================
// 核心動畫渲染器：根據進度 p (0.0 ~ 1.0) 同步更新頂部字幕、XY 圖、Z 軸圖
//   0.00 ~ 0.24 : 步驟 1 - 印橘色外皮牆 (Walls)
//   0.24 ~ 0.62 : 步驟 2 - 印肚子紅色支撐骨架 (Infill & Collisions)
//   0.62 ~ 0.88 : 步驟 3 - 噴嘴蓋藍色屋頂 (Roof Bridging / Noodle Sagging)
//   0.88 ~ 1.00 : 完成定格展示 (Hold final result for inspection)
// =========================================================
function renderFrameAt(p) {
  if (!VZ_ANIM.xyData || !VZ_ANIM.zData) return;

  var stagePill = document.getElementById('vz-stage-pill');
  var stageText = document.getElementById('vz-stage-text');
  var progFill = document.getElementById('vz-progress-fill');
  if (progFill) {
    progFill.style.width = Math.min(100, Math.round((p / 0.88) * 100)) + '%';
  }

  var xy = VZ_ANIM.xyData;
  var z = VZ_ANIM.zData;

  if (p < 0.24) {
    if (stagePill) {
      stagePill.textContent = '🟧 步驟 1 / 3：印外皮牆';
      stagePill.style.background = '#ea580c';
    }
    if (stageText) {
      stageText.textContent = '噴嘴先繞著邊緣畫 ' + state.walls + ' 圈「橘色外皮牆」——外皮越厚，零件越耐扳不斷裂！';
    }
  } else if (p < 0.62) {
    if (stagePill) {
      stagePill.textContent = '🟥 步驟 2 / 3：印肚子支撐';
      stagePill.style.background = '#dc2626';
    }
    if (stageText) {
      stageText.textContent = xy.diag.isCrossCollision
        ? '⚠️ 慘劇發生！噴嘴畫直線跨越橫線時「同層十字硬撞」，PETG 刮頭結瘤發出異音！'
        : '噴嘴在肚子裡吐絲印出「紅色支撐骨架」，並在頂端形成托住屋頂的 🟢 綠色支撐點！';
    }
  } else {
    if (stagePill) {
      stagePill.textContent = z.hasSagSpan ? '🚨 步驟 3 / 3：屋頂踩空塌陷！' : '🟦 步驟 3 / 3：平鋪藍色屋頂';
      stagePill.style.background = z.hasSagSpan ? '#dc2626' : '#0284c7';
    }
    if (stageText) {
      stageText.textContent = z.hasSagSpan
        ? '😱 翻車現場！底下兩個🟢綠點隔太遠，噴嘴經過大空洞時熱塑膠像軟麵條直接往下掉！'
        : '✅ 完美收尾！噴嘴從左往右拉線蓋屋頂，底下密集的🟢綠點像橋墩一樣穩穩托住！';
    }
  }

  renderXYFrame(xy, p);
  renderZFrame(z, p);
}

// ---------------------------------------------------------
// 繪製左圖 (XY 俯視圖) 單格畫面
// ---------------------------------------------------------
function renderXYFrame(xy, p) {
  var wallsG = document.getElementById('xy-walls');
  var infillG = document.getElementById('xy-infill');
  var markersG = document.getElementById('xy-markers');
  var nozzleG = document.getElementById('xy-nozzle');
  if (!wallsG || !infillG || !markersG || !nozzleG) return;

  // 1. 外牆進度 (0.00 ~ 0.24 逐圈畫出)
  var wallProg = Math.min(1, p / 0.22);
  var activeWalls = Math.max(1, Math.ceil(wallProg * state.walls));
  var wHtml = '';
  for (var w = 0; w < activeWalls; w++) {
    var rx = xy.bx + w * xy.stepW;
    var ry = xy.by + w * xy.stepW;
    var rw = xy.bw - w * xy.stepW * 2;
    var rh = xy.bh - w * xy.stepW * 2;
    var stroke = (w === 0) ? '#c2410c' : (w % 2 === 1 ? '#ea580c' : '#fb923c');
    var fill = (w === state.walls - 1) ? '#ffffff' : 'none';
    wHtml += '<rect x="' + rx + '" y="' + ry + '" width="' + rw + '" height="' + rh + '" rx="' + Math.max(3, 12 - w * 2) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3.6" />';
  }
  wallsG.innerHTML = wHtml;

  // 2. 內部填充進度 (0.24 ~ 0.62 隨噴嘴一條一條吐絲畫出)
  var infProg = (p <= 0.24) ? 0 : Math.min(1, (p - 0.24) / 0.38);
  var segs = xy.segments;
  var totalSegs = segs.length;
  var exactSeg = infProg * totalSegs;
  var currentSegIdx = Math.min(totalSegs - 1, Math.floor(exactSeg));
  var currentSegFrac = exactSeg - currentSegIdx;

  var infHtml = xy.staticBgHtml;
  var nozzlePos = null;
  var isCollidingNow = false;

  if (p < 0.24) {
    // 步驟 1：噴嘴繞著最內圈橘色外牆跑一圈
    var curW = Math.min(state.walls - 1, Math.floor(wallProg * state.walls));
    var wx = xy.bx + curW * xy.stepW;
    var wy = xy.by + curW * xy.stepW;
    var ww = xy.bw - curW * xy.stepW * 2;
    var wh = xy.bh - curW * xy.stepW * 2;
    var loopT = (wallProg * state.walls) % 1;
    nozzlePos = pointOnRectPerimeter(wx, wy, ww, wh, loopT);
  } else if (totalSegs > 0) {
    for (var s = 0; s < totalSegs; s++) {
      if (s < currentSegIdx || infProg >= 1) {
        infHtml += buildPolylineSvg(segs[s].points, 1.0, segs[s].color, segs[s].width);
      } else if (s === currentSegIdx && infProg < 1) {
        infHtml += buildPolylineSvg(segs[s].points, currentSegFrac, segs[s].color, segs[s].width);
        nozzlePos = getPointAtPolylineFrac(segs[s].points, currentSegFrac);
      }
    }
  }

  infillG.innerHTML = infHtml;

  // 3. 繪製交叉撞擊點與爆炸特效
  var mkHtml = '';
  for (var c = 0; c < xy.collisions.length; c++) {
    var col = xy.collisions[c];
    var reached = (infProg >= 1) || (col.segIdx < currentSegIdx) || (col.segIdx === currentSegIdx && currentSegFrac >= col.segFrac);
    if (reached) {
      var justHit = (infProg < 1) && (col.segIdx === currentSegIdx) && Math.abs(currentSegFrac - col.segFrac) < 0.16;
      if (justHit) isCollidingNow = true;

      if (col.isSevere) {
        // PETG 嚴重撞頭結瘤紅點 + 衝擊波
        if (justHit) {
          mkHtml += '<circle cx="' + col.x + '" cy="' + col.y + '" r="14" fill="rgba(239,68,68,0.28)" stroke="#ef4444" stroke-width="2" />';
        }
        mkHtml += '<circle cx="' + col.x + '" cy="' + col.y + '" r="6" fill="#dc2626" stroke="#ffffff" stroke-width="1.6" />';
      } else {
        // PLA 一般十字交點
        if (justHit) {
          mkHtml += '<circle cx="' + col.x + '" cy="' + col.y + '" r="9" fill="rgba(245,158,11,0.25)" />';
        }
        mkHtml += '<circle cx="' + col.x + '" cy="' + col.y + '" r="3.4" fill="#f59e0b" />';
      }
    }
  }

  // 當內部填充畫完後，顯示頂部總結橫幅
  if (infProg >= 0.85) {
    mkHtml += xy.summaryBannerHtml;
  }
  markersG.innerHTML = mkHtml;

  // 4. 繪製 XY 噴嘴與即時跟隨小標籤
  if (p < 0.64 && nozzlePos) {
    var jitterX = (isCollidingNow && xy.diag.isCrossCollision) ? ((Math.random() - 0.5) * 6) : 0;
    var jitterY = (isCollidingNow && xy.diag.isCrossCollision) ? ((Math.random() - 0.5) * 6) : 0;
    var nx = Math.round(nozzlePos[0] + jitterX);
    var ny = Math.round(nozzlePos[1] + jitterY);
    var nozzleColor = (isCollidingNow && xy.diag.isCrossCollision) ? '#dc2626' : '#f59e0b';
    var tagText = (p < 0.24)
      ? '🟧 吐絲印外牆中'
      : ((isCollidingNow && xy.diag.isCrossCollision) ? '💥 撞上橫線刮頭！' : '🟥 噴嘴吐絲走線中');
    var tagBg = (isCollidingNow && xy.diag.isCrossCollision) ? '#dc2626' : '#1e293b';

    var tagX = (nx > 210) ? (nx - 112) : (nx + 12);
    var tagY = (ny < 36) ? (ny + 6) : (ny - 22);

    nozzleG.innerHTML =
      '<g>' +
        '<circle cx="' + nx + '" cy="' + ny + '" r="10" fill="rgba(51,65,85,0.88)" stroke="#ffffff" stroke-width="1.5" />' +
        '<circle cx="' + nx + '" cy="' + ny + '" r="5" fill="' + nozzleColor + '" />' +
        '<circle cx="' + nx + '" cy="' + ny + '" r="2" fill="#ffffff" />' +
        '<rect x="' + tagX + '" y="' + tagY + '" width="102" height="19" rx="5" fill="' + tagBg + '" opacity="0.94" />' +
        '<text x="' + (tagX + 51) + '" y="' + (tagY + 13) + '" text-anchor="middle" font-size="10" fill="#ffffff" font-weight="bold">' + tagText + '</text>' +
      '</g>';
  } else {
    nozzleG.innerHTML = '';
  }
}

// ---------------------------------------------------------
// 繪製右圖 (Z 軸側面剖面圖) 單格畫面
// ---------------------------------------------------------
function renderZFrame(z, p) {
  var nozzleG = document.getElementById('z-nozzle');
  var wallsG = document.getElementById('z-walls');
  var pillarsG = document.getElementById('z-pillars');
  var roofG = document.getElementById('z-roof');
  var annG = document.getElementById('z-annotations');
  var clipRect = document.getElementById('z-clip-rect');
  if (!nozzleG || !wallsG || !pillarsG || !roofG || !annG) return;

  // 1. 步驟 1 (0.00 ~ 0.24)：底部實心層與左右垂直橘色外牆由下往上長高
  var wallGrow = Math.min(1, p / 0.22);
  var totalWallH = z.bedTopY - z.roofTopY;
  var curWallH = Math.round(totalWallH * wallGrow);
  var curWallTopY = z.bedTopY - curWallH;

  var wHtml = '';
  wHtml += '<rect x="' + z.inLeft + '" y="' + z.roofUndersideY + '" width="' + z.innerSpan + '" height="' + z.cavityH + '" fill="#fffbeb" opacity="0.55" />';

  for (var b = 0; b < 3; b++) {
    var by = z.bottomSolidTopY + b * 4;
    wHtml += '<rect x="' + z.inLeft + '" y="' + by + '" width="' + z.innerSpan + '" height="3.6" fill="#fb923c" stroke="#ea580c" stroke-width="0.6" />';
  }

  for (var w = 0; w < state.walls; w++) {
    var lx = z.outerLeft + w * z.loopW;
    var rx = z.outerRight - (w + 1) * z.loopW;
    var wColor = (w % 2 === 0) ? '#ea580c' : '#f97316';
    wHtml += '<rect x="' + lx + '" y="' + curWallTopY + '" width="' + (z.loopW - 0.5) + '" height="' + curWallH + '" rx="1.2" fill="' + wColor + '" stroke="#c2410c" stroke-width="0.6" />';
    wHtml += '<rect x="' + rx + '" y="' + curWallTopY + '" width="' + (z.loopW - 0.5) + '" height="' + curWallH + '" rx="1.2" fill="' + wColor + '" stroke="#c2410c" stroke-width="0.6" />';
  }

  if (wallGrow >= 0.7) {
    wHtml += '<rect x="' + z.outerLeft + '" y="122" width="54" height="18" rx="4" fill="rgba(194,65,12,0.95)" />' +
      '<text x="' + (z.outerLeft + 27) + '" y="134" text-anchor="middle" font-size="10" fill="#ffffff" font-weight="bold">外牆 ' + state.walls + ' 圈</text>';
  }
  wallsG.innerHTML = wHtml;

  // 2. 步驟 2 (0.24 ~ 0.62)：內部紅色支撐骨架由下往上長到屋頂底面 y=70
  var pillarGrow = (p <= 0.24) ? 0 : Math.min(1, (p - 0.24) / 0.34);
  if (clipRect) {
    var curPillarH = Math.round(z.cavityH * pillarGrow);
    var curPillarTopY = z.bottomSolidTopY - curPillarH;
    clipRect.setAttribute('y', curPillarTopY);
    clipRect.setAttribute('height', curPillarH);
  }
  pillarsG.innerHTML = (pillarGrow > 0) ? z.pHtml : '';

  // 3. 步驟 3 (0.62 ~ 0.88)：噴嘴從左往右橫移鋪設藍色屋頂 (拉麵條下垂 vs 平整搭橋)
  var roofProg = (p <= 0.62) ? 0 : Math.min(1, (p - 0.62) / 0.26);
  var nozzleX = Math.round(z.inLeft + roofProg * z.innerSpan);

  var rHtml = '';
  var annHtml = '';
  if (pillarGrow >= 0.85) {
    annHtml += z.extraAnnHtml;
  }

  // 當支架長到頂端時，畫出每一顆「🟢 綠色支撐接觸點」
  if (pillarGrow >= 0.92) {
    for (var gIdx = 1; gIdx < z.supports.length - 1; gIdx++) {
      var gx = z.supports[gIdx];
      var isTouchingNow = (roofProg > 0 && roofProg < 1 && Math.abs(nozzleX - gx) < 14);
      if (isTouchingNow) {
        annHtml += '<circle cx="' + gx + '" cy="' + z.roofUndersideY + '" r="8" fill="rgba(34,197,94,0.35)" />';
      }
      annHtml += '<circle cx="' + gx + '" cy="' + z.roofUndersideY + '" r="4.3" fill="#16a34a" stroke="#ffffff" stroke-width="1.3" />';
    }
  }

  // 繪製藍色屋頂（只畫到目前噴嘴走到的 nozzleX 位置）
  if (roofProg > 0) {
    var roofSpanH = z.roofUndersideY - z.roofTopY;
    var layerStepH = roofSpanH / z.roofLayers;

    for (var lIdx = 0; lIdx < z.roofLayers; lIdx++) {
      var ly2 = Math.round((z.roofTopY + (lIdx + 0.5) * layerStepH) * 10) / 10;
      var depthRatio = (lIdx + 1) / z.roofLayers;
      var dRoof = 'M ' + z.inLeft + ' ' + ly2;

      for (var seg = 0; seg < z.supports.length - 1; seg++) {
        var sx1 = z.supports[seg];
        var sx2 = z.supports[seg + 1];
        if (nozzleX <= sx1) break;

        var segEndX = Math.min(sx2, nozzleX);
        var segRatio = (segEndX - sx1) / (sx2 - sx1);
        var spanW = sx2 - sx1;
        var midSpanX = Math.round((sx1 + segEndX) / 2);

        if (z.hasSagSpan && spanW > 56) {
          // 踩空跨距：隨噴嘴往中間走，塑膠線直接像軟麵條往下掉！
          var maxDroop = Math.min(36, (spanW - 40) * 0.48);
          var layerDroop = Math.round(maxDroop * (0.45 + 0.55 * depthRatio) * Math.sin(segRatio * Math.PI * 0.5));
          dRoof += ' Q ' + midSpanX + ' ' + Math.round(ly2 + layerDroop) + ', ' + segEndX + ' ' + (segRatio < 0.85 ? Math.round(ly2 + layerDroop * 0.7) : ly2);
        } else {
          dRoof += ' L ' + segEndX + ' ' + ly2;
        }
      }

      var strokeColor = z.hasSagSpan
        ? (lIdx === 0 ? '#dc2626' : '#f87171')
        : (lIdx === 0 ? '#0284c7' : '#38bdf8');
      var strokeW = (lIdx === 0) ? 3.2 : 2.2;
      rHtml += '<path d="' + dRoof + '" fill="none" stroke="' + strokeColor + '" stroke-width="' + strokeW + '" stroke-linecap="round" />';
    }
  }

  // 若處於踩空塌陷狀態，畫出往下滴落的塑膠麵條與頂面凹洞警示
  var isInSagZoneNow = false;
  if (z.hasSagSpan && z.sagGapInfo && roofProg > 0) {
    var sg = z.sagGapInfo;
    if (nozzleX > sg.sx1 + 15 && nozzleX < sg.sx2 - 10 && roofProg < 1) {
      isInSagZoneNow = true;
    }
    if (nozzleX >= sg.midX) {
      // 畫出掉進空腔的斷裂垂墜軟麵條水滴
      rHtml += '<circle cx="' + sg.midX + '" cy="92" r="3" fill="#ef4444" />' +
               '<circle cx="' + (sg.midX - 10) + '" cy="87" r="2.2" fill="#f87171" />' +
               '<circle cx="' + (sg.midX + 12) + '" cy="88" r="2.2" fill="#f87171" />';
      annHtml +=
        '<rect x="' + (sg.midX - 66) + '" y="26" width="132" height="20" rx="5" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5" />' +
        '<text x="' + sg.midX + '" y="40" text-anchor="middle" font-size="10.5" fill="#dc2626" font-weight="bold">⚠️ 踩空下垂塌陷凹洞！</text>';
    }
  } else if (!z.hasSagSpan && roofProg >= 0.85) {
    annHtml +=
      '<rect x="52" y="26" width="256" height="20" rx="5" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.5" />' +
      '<text x="180" y="40" text-anchor="middle" font-size="10.5" fill="#15803d" font-weight="bold">✅ 🟢支撐點密集托住，' + z.roofLayers + ' 層藍色屋頂平整完美！</text>';
  }

  roofG.innerHTML = rHtml;
  annG.innerHTML = annHtml;

  // 4. 繪製 Z 軸上方移動噴嘴
  if (p >= 0.62 && p < 0.90) {
    var streamEndY = isInSagZoneNow ? 82 : 54;
    var streamColor = isInSagZoneNow ? '#dc2626' : '#0284c7';
    var headColor = isInSagZoneNow ? '#dc2626' : '#f59e0b';
    var calloutText = isInSagZoneNow ? '😱 底下沒綠點！塑膠下垂了！' : '🟦 噴嘴拉線蓋屋頂中';
    var calloutBg = isInSagZoneNow ? '#dc2626' : '#0284c7';
    var boxX = Math.min(220, Math.max(10, nozzleX - 60));

    nozzleG.innerHTML =
      '<g>' +
        '<rect x="' + (nozzleX - 12) + '" y="24" width="24" height="12" rx="3" fill="#334155" />' +
        '<polygon points="' + (nozzleX - 8) + ',36 ' + (nozzleX + 8) + ',36 ' + (nozzleX + 3) + ',45 ' + (nozzleX - 3) + ',45" fill="' + headColor + '" />' +
        '<line x1="' + nozzleX + '" y1="45" x2="' + nozzleX + '" y2="' + streamEndY + '" stroke="' + streamColor + '" stroke-width="3.2" stroke-linecap="round" />' +
        '<rect x="' + boxX + '" y="3" width="136" height="18" rx="4" fill="' + calloutBg + '" />' +
        '<text x="' + (boxX + 68) + '" y="15" text-anchor="middle" font-size="10" fill="#ffffff" font-weight="bold">' + calloutText + '</text>' +
      '</g>';
  } else {
    nozzleG.innerHTML = '';
  }
}

// ---------------------------------------------------------
// 幾何輔助函式：計算折線部分繪製與噴嘴座標
// ---------------------------------------------------------
function buildPolylineSvg(pts, frac, color, width) {
  if (!pts || pts.length < 2 || frac <= 0) return '';
  if (frac >= 1) {
    var dFull = 'M ' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      dFull += ' L ' + pts[i][0] + ' ' + pts[i][1];
    }
    return '<path d="' + dFull + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" />';
  }
  var totalLen = 0;
  var lens = [];
  for (var j = 0; j < pts.length - 1; j++) {
    var dx = pts[j + 1][0] - pts[j][0];
    var dy = pts[j + 1][1] - pts[j][1];
    var l = Math.sqrt(dx * dx + dy * dy);
    lens.push(l);
    totalLen += l;
  }
  var target = totalLen * frac;
  var acc = 0;
  var dPart = 'M ' + pts[0][0] + ' ' + pts[0][1];
  for (var k = 0; k < lens.length; k++) {
    if (acc + lens[k] <= target) {
      dPart += ' L ' + pts[k + 1][0] + ' ' + pts[k + 1][1];
      acc += lens[k];
    } else {
      var rem = (target - acc) / (lens[k] || 1);
      var px = Math.round(pts[k][0] + (pts[k + 1][0] - pts[k][0]) * rem);
      var py = Math.round(pts[k][1] + (pts[k + 1][1] - pts[k][1]) * rem);
      dPart += ' L ' + px + ' ' + py;
      break;
    }
  }
  return '<path d="' + dPart + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" />';
}

function getPointAtPolylineFrac(pts, frac) {
  if (!pts || pts.length === 0) return [180, 110];
  if (pts.length === 1 || frac <= 0) return pts[0];
  if (frac >= 1) return pts[pts.length - 1];
  var totalLen = 0;
  var lens = [];
  for (var j = 0; j < pts.length - 1; j++) {
    var dx = pts[j + 1][0] - pts[j][0];
    var dy = pts[j + 1][1] - pts[j][1];
    var l = Math.sqrt(dx * dx + dy * dy);
    lens.push(l);
    totalLen += l;
  }
  var target = totalLen * frac;
  var acc = 0;
  for (var k = 0; k < lens.length; k++) {
    if (acc + lens[k] >= target) {
      var rem = (target - acc) / (lens[k] || 1);
      return [
        pts[k][0] + (pts[k + 1][0] - pts[k][0]) * rem,
        pts[k][1] + (pts[k + 1][1] - pts[k][1]) * rem
      ];
    }
    acc += lens[k];
  }
  return pts[pts.length - 1];
}

function pointOnRectPerimeter(x, y, w, h, t) {
  var p = Math.max(0, Math.min(1, t)) * 4;
  if (p < 1) return [x + w * p, y];
  if (p < 2) return [x + w, y + h * (p - 1)];
  if (p < 3) return [x + w * (1 - (p - 2)), y + h];
  return [x, y + h * (1 - (p - 3))];
}