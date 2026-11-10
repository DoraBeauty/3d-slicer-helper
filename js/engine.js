    // =========================================================
    // 5. 即時工程防翻車診斷引擎 (Real-Time Diagnostic Engine)
    // =========================================================
    function evaluateDiagnostics() {
      var patObj = PATTERN_INFO[state.pattern];

      // 風險 1：屋頂踩空下垂塌陷 (Roof Sagging)
      // 發生在：大平頂 + 閃電填充，或大平頂 + 螺旋體 <= 8%，或任何圖案在 5% 極低密度印大平頂（網格/直線/自適應除外）
      var isRoofSagging = false;
      if (state.roofShape === 'flat') {
        if (state.pattern === 'lightning') {
          isRoofSagging = true;
        } else if (state.pattern === 'gyroid' && state.density <= 8) {
          isRoofSagging = true;
        } else if (state.density <= 5 && state.pattern !== 'grid' && state.pattern !== 'line' && state.pattern !== 'adaptive') {
          isRoofSagging = true;
        }
      }

      // 風險 2：同層十字交叉刮噴嘴 (Nozzle Rubbing on PETG / TPU)
      var isCrossCollision = (state.filament === 'petg' || state.filament === 'tpu') && patObj.hasCross;

      // 風險 3：高填充低外牆浪費警報 (High Infill >= 30% but Walls <= 2)
      var isStrengthWaste = (state.density >= 30 && state.walls <= 2);

      // 風險 4：雙輸慢速費料圖案 (Honeycomb / CrossHatch)
      var isSlowPattern = (state.pattern === 'honeycomb' || state.pattern === 'crosshatch');

      return {
        isRoofSagging: isRoofSagging,
        isCrossCollision: isCrossCollision,
        isStrengthWaste: isStrengthWaste,
        isSlowPattern: isSlowPattern
      };
    }

    // =========================================================
    // 6. 總渲染更新函數 (Master Render)
    // =========================================================
    function renderAll() {
      var diag = evaluateDiagnostics();
      var patObj = PATTERN_INFO[state.pattern];

      // 更新頂部慘劇按鈕高亮狀態
      for (var t = 1; t <= 3; t++) {
        var tBtn = document.getElementById('trap-btn-' + t);
        if (tBtn) tBtn.classList.toggle('active', state.activeTrap === t);
      }
      var fixBtn = document.getElementById('trap-btn-fix');
      if (fixBtn) fixBtn.classList.toggle('active', state.activeTrap === 0);

      // 更新模式 A 物品卡片高亮
      var itemBtns = document.querySelectorAll('.item-card-btn');
      for (var i = 0; i < itemBtns.length; i++) {
        var k = itemBtns[i].getAttribute('data-item');
        itemBtns[i].classList.toggle('active', state.mode === 'items' && state.selectedItem === k && state.activeTrap === 0);
      }

      // 更新模式 B 問答按鈕高亮
      var qaUseBtns = document.querySelectorAll('[data-qa-use]');
      for (var u = 0; u < qaUseBtns.length; u++) {
        qaUseBtns[u].classList.toggle('active', qaUseBtns[u].getAttribute('data-qa-use') === state.qa.use);
      }
      var qaShapeBtns = document.querySelectorAll('[data-qa-shape]');
      for (var s = 0; s < qaShapeBtns.length; s++) {
        qaShapeBtns[s].classList.toggle('active', qaShapeBtns[s].getAttribute('data-qa-shape') === state.qa.shape);
      }
      var qaSizeBtns = document.querySelectorAll('[data-qa-size]');
      for (var z = 0; z < qaSizeBtns.length; z++) {
        qaSizeBtns[z].classList.toggle('active', qaSizeBtns[z].getAttribute('data-qa-size') === state.qa.size);
      }
      var qaEnvBtns = document.querySelectorAll('[data-qa-env]');
      for (var e = 0; e < qaEnvBtns.length; e++) {
        qaEnvBtns[e].classList.toggle('active', qaEnvBtns[e].getAttribute('data-qa-env') === state.qa.env);
      }

      // 更新 SECTION 2 照抄面板數值
      document.getElementById('selected-item-banner').textContent = '📋 ' + state.itemTitle + ' 照抄參數單';
      var filBadge = document.getElementById('out-filament-badge');
      if (state.filament === 'pla') {
        filBadge.className = 'filament-badge fil-pla';
        filBadge.textContent = '🟢 PLA / PLA+ 線材';
      } else if (state.filament === 'petg') {
        filBadge.className = 'filament-badge fil-petg';
        filBadge.textContent = '🟠 PETG 耐熱韌性線';
      } else {
        filBadge.className = 'filament-badge fil-tpu';
        filBadge.textContent = '🟣 TPU 軟Q橡膠線';
      }
      document.getElementById('filament-reason-text').textContent = state.filamentReason;

      document.getElementById('out-walls').textContent = state.walls + ' 圈';
      document.getElementById('out-top-layers').textContent = state.topLayers + ' 層';
      document.getElementById('out-density').textContent = state.density + ' %';
      document.getElementById('out-pattern').textContent = patObj.name;
      document.getElementById('explain-pattern').innerHTML = '💬 <strong>圖案物理特性：</strong>' + patObj.plainDesc;

      // 折疊箱分件教學盒高亮提示
      var comboBox = document.getElementById('combo-secret-box');
      var comboTag = document.getElementById('combo-tag');
      if (state.selectedItem === 'folding_box') {
        comboBox.style.borderColor = '#dc2626';
        comboBox.style.backgroundColor = '#fef2f2';
        comboTag.style.backgroundColor = '#dc2626';
        comboTag.textContent = '🔥 當前物品必用神技！';
      } else {
        comboBox.style.borderColor = '#3b82f6';
        comboBox.style.backgroundColor = '#eff6ff';
        comboTag.style.backgroundColor = '#2563eb';
        comboTag.textContent = '組合件進階秘訣';
      }

      // 更新即時防翻車警報橫幅
      var radarHtml = '';
      if (diag.isRoofSagging) {
        radarHtml += '<div class="radar-alert radar-danger">' +
          '🚨 <strong>【屋頂踩空塌陷警告】</strong>請看右邊「Z 軸側面剖面圖」！目前屋頂下的<strong>🟢綠色支撐點隔太遠</strong>，第一層搭橋塑膠跨度過大往下垂墜，印出來表面必起疙瘩凹洞！<br/>' +
          '👉 <strong>一鍵解法：</strong>將圖案改為 <strong>「🕸️ 網格 (PLA)」</strong>、<strong>「📏 直線 (PETG)」</strong>，或把螺旋體密度提高到 <strong>12%~15%</strong> 以上。' +
          '</div>';
      }
      if (diag.isCrossCollision) {
        radarHtml += '<div class="radar-alert radar-danger">' +
          '🚨 <strong>【噴嘴刮蹭結瘤警告】</strong>請看右邊「XY 俯視切片圖」上的<strong>🔴紅色交叉點</strong>！印 PETG / TPU 時選用「' + patObj.name + '」，噴嘴會在同一層十字路口重複撞擊堆料，發出卡啦異音甚至撞掉模型！<br/>' +
          '👉 <strong>一鍵解法：</strong>請立即改選同層零交叉的 <strong>「📏 直線 (Line)」</strong> 或 <strong>「🌀 螺旋體 (Gyroid)」</strong>。' +
          '</div>';
      }
      if (diag.isStrengthWaste) {
        radarHtml += '<div class="radar-alert radar-warn">' +
          '⚠️ <strong>【結構效益失衡提醒】</strong>你把填充密度拉高到了 <strong>' + state.density + '%</strong>，但外皮「牆圈數」卻只有 <strong>' + state.walls + ' 圈</strong>！零件受彎曲力時由最外層承受最大應力，請先把<strong>「牆圈數改為 3~4 圈」</strong>，填充降回 <strong>15%~20%</strong>，更堅固且省下一半時間與線材！' +
          '</div>';
      }
      if (diag.isSlowPattern) {
        radarHtml += '<div class="radar-alert radar-warn">' +
          '⚠️ <strong>【耗時耗料地雷提醒】</strong>「' + patObj.name + '」在工程實測中路徑轉折繁複，比螺旋體或自適應立方體多花 20~30 分鐘且多耗料，建議切換為其他主力圖案。' +
          '</div>';
      }
      if (!radarHtml) {
        radarHtml = '<div class="radar-alert radar-ok">' +
          '✅ <strong>【工程檢測通過：最佳安全配置】</strong>屋頂下方 <strong>🟢綠色支撐點密集無踩空</strong>、噴嘴走線順暢不刮頭、外皮與肚子密度比例完美，可直接照抄列印！' +
          '</div>';
      }
      document.getElementById('radar-container').innerHTML = radarHtml;

      // 更新底部手動控制項狀態
      var patPills = document.querySelectorAll('[data-pat]');
      for (var p = 0; p < patPills.length; p++) {
        patPills[p].classList.toggle('active', patPills[p].getAttribute('data-pat') === state.pattern);
      }
      var filPills = document.querySelectorAll('[data-fil]');
      for (var f = 0; f < filPills.length; f++) {
        filPills[f].classList.toggle('active', filPills[f].getAttribute('data-fil') === state.filament);
      }
      document.getElementById('rng-walls').value = state.walls;
      document.getElementById('lbl-walls').textContent = state.walls + ' 圈';
      document.getElementById('rng-density').value = state.density;
      document.getElementById('lbl-density').textContent = state.density + ' %';

      // 繪製雙視角真實物理幾何圖
      drawCartoonXY(diag);
      drawCartoonZ(diag);
    }

