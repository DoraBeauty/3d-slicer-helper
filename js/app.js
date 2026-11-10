    // =========================================================
    // 4. 模式切換、物品點選、四問計算與慘劇觸發函數
    // =========================================================
    function switchMode(mode) {
      state.mode = mode;
      document.getElementById('tab-btn-items').classList.toggle('active', mode === 'items');
      document.getElementById('tab-btn-qa').classList.toggle('active', mode === 'qa');
      document.getElementById('panel-items').style.display = (mode === 'items') ? 'block' : 'none';
      document.getElementById('panel-qa').style.display = (mode === 'qa') ? 'block' : 'none';

      if (mode === 'items') {
        selectEverydayItem(state.selectedItem);
      } else {
        computeFromQA();
      }
    }

    function selectEverydayItem(itemKey) {
      var preset = ITEM_PRESETS[itemKey];
      if (!preset) return;
      state.selectedItem = itemKey;
      state.itemTitle = preset.title;
      state.filament = preset.filament;
      state.filamentReason = preset.filamentReason;
      state.walls = preset.walls;
      state.topLayers = preset.topLayers;
      state.density = preset.density;
      state.pattern = preset.pattern;
      state.roofShape = preset.roofShape;
      state.size = preset.size;
      state.useType = preset.useType;
      state.activeTrap = 0;
      renderAll();
    }

    function setQAAnswer(field, value) {
      state.qa[field] = value;
      state.activeTrap = 0;
      computeFromQA();
    }

    function computeFromQA() {
      var u = state.qa.use;
      var sh = state.qa.shape;
      var sz = state.qa.size;
      var env = state.qa.env;

      state.useType = u;
      state.roofShape = sh;
      state.size = sz;

      // 1. 根據環境決定線材
      if (env === 'soft') {
        state.filament = 'tpu';
        state.filamentReason = '軟Q防摔需求，自動選用 TPU 彈性橡膠線材';
      } else if (env === 'outdoor' || u === 'flex' || u === 'strong') {
        state.filament = 'petg';
        state.filamentReason = (env === 'outdoor')
          ? '戶外或車內耐高溫防曬需求，自動選用 PETG 線材（並避開網格刮噴頭）'
          : '需要高韌性抗折彎或高承重，推薦選用 PETG 線材';
      } else {
        state.filament = 'pla';
        state.filamentReason = '室內常溫使用，推薦最好印、表面最平整的 PLA / PLA+ 線材';
      }

      // 2. 根據用途、頂面、大小與線材決定牆圈數、頂層數、密度與填充圖案
      if (state.filament === 'tpu') {
        state.pattern = 'gyroid';
        state.walls = 3;
        state.topLayers = 4;
        state.density = (sh === 'flat') ? 15 : 12;
      } else if (u === 'statue') {
        state.walls = 2;
        state.topLayers = (sh === 'flat') ? 5 : 4;
        if (sz === 'small') {
          state.pattern = (state.filament === 'petg') ? 'line' : 'grid';
          state.density = 12;
        } else if (sh === 'sharp') {
          state.pattern = 'lightning';
          state.density = 10;
        } else if (sh === 'flat') {
          state.pattern = (state.filament === 'petg') ? 'line' : 'grid';
          state.density = 10;
        } else {
          state.pattern = (state.filament === 'petg') ? 'gyroid' : 'adaptive';
          state.density = 8;
        }
      } else if (u === 'box') {
        state.walls = (sz === 'small') ? 3 : 2;
        state.topLayers = (sh === 'flat') ? 5 : 4;
        state.pattern = (state.filament === 'petg') ? 'line' : 'grid';
        state.density = (sh === 'flat') ? 12 : 10;
      } else if (u === 'flex') {
        state.walls = 3;
        state.topLayers = (sh === 'flat') ? 5 : 4;
        state.pattern = 'gyroid';
        state.density = (sz === 'small' || sh === 'flat') ? 15 : 12;
      } else if (u === 'strong') {
        state.walls = 4;
        state.topLayers = 5;
        state.pattern = (state.filament === 'petg') ? 'gyroid' : 'cubic';
        state.density = 20;
      }

      var useNames = { statue: '觀賞擺件', box: '收納容器', flex: '抗折彎卡扣', strong: '高承重結構' };
      var shapeNames = { flat: '大平頂', curve: '圓弧頂', sharp: '尖頂' };
      state.itemTitle = '🧭 自訂組合：【' + useNames[u] + '＋' + shapeNames[sh] + '】';

      renderAll();
    }

    // 頂部 3 大翻車體驗按鈕與 1 鍵修復
    function triggerTrap(trapNum) {
      state.activeTrap = trapNum;
      if (trapNum === 1) {
        // 慘劇1：平底盒用 5% 螺旋體（屋頂踩空塌陷）
        state.itemTitle = '💥 慘劇1演示：平底收納盒誤用「5% 螺旋體」';
        state.filament = 'pla';
        state.filamentReason = '雖然用了好印的 PLA，但 5% 螺旋體波峰跨距太大導致屋頂踩空塌陷！';
        state.walls = 2;
        state.topLayers = 4;
        state.density = 5;
        state.pattern = 'gyroid';
        state.roofShape = 'flat';
        state.useType = 'box';
      } else if (trapNum === 2) {
        // 慘劇2：PETG 用網格（十字交叉結瘤刮噴嘴）
        state.itemTitle = '💥 慘劇2演示：印 PETG 耐熱線卻誤選「網格 (Grid)」';
        state.filament = 'petg';
        state.filamentReason = 'PETG 熔融時易沾黏，遇到網格同層十字交叉點必堆料刮噴頭！';
        state.walls = 2;
        state.topLayers = 4;
        state.density = 15;
        state.pattern = 'grid';
        state.roofShape = 'flat';
        state.useType = 'box';
      } else if (trapNum === 3) {
        // 慘劇3：填充狂拉 40% 卻只設 2 圈牆（費時費料）
        state.itemTitle = '💥 慘劇3演示：想印堅固支架卻「狂拉 40% 填充＋只設 2 圈牆」';
        state.filament = 'pla';
        state.filamentReason = '外皮只有 2 圈承受不住彎曲力，肚子塞滿 40% 塑膠只是白花錢又浪費兩倍時間！';
        state.walls = 2;
        state.topLayers = 4;
        state.density = 40;
        state.pattern = 'grid';
        state.roofShape = 'flat';
        state.useType = 'strong';
      }
      renderAll();
    }

    function restoreRecommended() {
      state.activeTrap = 0;
      if (state.mode === 'items') {
        selectEverydayItem(state.selectedItem);
      } else {
        computeFromQA();
      }
    }

    // 手動微調控制項
    function manualChangePattern(pat) {
      state.pattern = pat;
      state.activeTrap = -1;
      renderAll();
    }

    function manualChangeFilament(fil) {
      state.filament = fil;
      state.activeTrap = -1;
      renderAll();
    }

    function stepVal(field, delta) {
      if (field === 'walls') {
        state.walls = Math.max(2, Math.min(6, state.walls + delta));
      } else if (field === 'density') {
        state.density = Math.max(5, Math.min(50, state.density + delta));
      }
      state.activeTrap = -1;
      renderAll();
    }

    function onManualSlider() {
      state.walls = parseInt(document.getElementById('rng-walls').value, 10) || 2;
      state.density = parseInt(document.getElementById('rng-density').value, 10) || 10;
      state.activeTrap = -1;
      renderAll();
    }

    function toggleLayerPreview() {
      state.previewLayer = (state.previewLayer === 15) ? 16 : 15;
      renderAll();
    }

    // =========================================================
    // 9. 一鍵複製照抄參數單
    // =========================================================
    function copyBeginnerSheet() {
      var patName = (state.selectedItem === 'folding_box' && state.activeTrap === 0)
        ? '底板用【網格/直線】＋側板用【螺旋體】'
        : PATTERN_INFO[state.pattern].name;

      var filName = (state.filament === 'pla') ? 'PLA / PLA+ (新手好印線)'
                  : (state.filament === 'petg') ? 'PETG (耐曬高韌性線)'
                  : 'TPU (軟Q彈性線)';

      var text = '【3D 列印新手傻瓜調參神器 — ' + state.itemTitle + '】\n' +
        '🛒 推薦線材：' + filName + '\n' +
        '📍 軟體位置：Bambu Studio 左側【強度 (Strength)】分頁：\n' +
        '  ① 牆圈數 (Wall loops - 外皮厚度)：' + state.walls + ' 圈\n' +
        '  ② 頂部殼體層數 (Top shell layers - 屋頂層數)：' + state.topLayers + ' 層\n' +
        '  ③ 稀疏填充密度 (Sparse infill density - 肚子支架疏密)：' + state.density + ' %\n' +
        '  ④ 稀疏填充圖案 (Sparse infill pattern - 肚子支架排法)：' + patName + '\n';

      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);

      var btn = document.getElementById('copy-btn');
      btn.textContent = '✅ 已複製到剪貼簿！';
      setTimeout(function() {
        btn.textContent = '📋 複製設定單到記事本';
      }, 2000);
    }

    // 啟動初始化渲染
    renderAll();
