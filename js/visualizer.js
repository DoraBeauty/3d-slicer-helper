    // =========================================================
    // 7. 繪製左圖：XY 俯視切片圖 (含 <clipPath> 防溢界與奇偶層切換)
    // =========================================================
    function drawCartoonXY(diag) {
      var wallsG = document.getElementById('xy-walls');
      var infillG = document.getElementById('xy-infill');
      var markersG = document.getElementById('xy-markers');
      var clipRect = document.getElementById('xy-clip-rect');
      var badge = document.getElementById('xy-status-badge');
      var layerTxt = document.getElementById('layer-indicator-text');
      var caption = document.getElementById('xy-caption');

      var isOddLayer = (state.previewLayer === 15);
      layerTxt.textContent = isOddLayer
        ? '👀 目前預覽：奇數層 (第 15 層) 噴頭走線'
        : '👀 目前預覽：偶數層 (第 16 層) 噴頭走線';

      // 1. 繪製 2~6 圈橘色外皮牆 (Nested Rounded Rectangles)
      var wHtml = '';
      var bx = 22, by = 14, bw = 316, bh = 196, stepW = 5.0;
      for (var w = 0; w < state.walls; w++) {
        var rx = bx + w * stepW;
        var ry = by + w * stepW;
        var rw = bw - w * stepW * 2;
        var rh = bh - w * stepW * 2;
        var stroke = (w === 0) ? '#c2410c' : (w % 2 === 1 ? '#ea580c' : '#fb923c');
        var fill = (w === state.walls - 1) ? '#ffffff' : 'none';
        wHtml += '<rect x="' + rx + '" y="' + ry + '" width="' + rw + '" height="' + rh + '" rx="' + Math.max(3, 12 - w * 2) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3.6" />';
      }
      wallsG.innerHTML = wHtml;

      // 計算內部空腔精準邊界並更新 SVG <clipPath>
      var pad = state.walls * stepW + 2;
      var ix = Math.round(bx + pad);
      var iy = Math.round(by + pad);
      var iw = Math.round(bw - pad * 2);
      var ih = Math.round(bh - pad * 2);
      var iright = ix + iw;
      var ibottom = iy + ih;

      clipRect.setAttribute('x', ix);
      clipRect.setAttribute('y', iy);
      clipRect.setAttribute('width', iw);
      clipRect.setAttribute('height', ih);
      clipRect.setAttribute('rx', Math.max(2, 10 - state.walls * 2));

      var count = Math.max(2, Math.min(9, Math.round(state.density / 5) + 1));
      var sx = iw / (count + 1);
      var sy = ih / (count + 1);

      var infHtml = '';
      var mkHtml = '';

      if (state.pattern === 'grid') {
        // 網格：同一層同時畫 X 與 Y 交錯線，產生同層十字交叉點
        for (var i = 1; i <= count; i++) {
          var cx = Math.round(ix + i * sx);
          var cy = Math.round(iy + i * sy);
          infHtml += '<line x1="' + cx + '" y1="' + iy + '" x2="' + cx + '" y2="' + ibottom + '" />';
          infHtml += '<line x1="' + ix + '" y1="' + cy + '" x2="' + iright + '" y2="' + cy + '" />';
        }
        for (var gx = 1; gx <= count; gx++) {
          for (var gy = 1; gy <= count; gy++) {
            var px = Math.round(ix + gx * sx);
            var py = Math.round(iy + gy * sy);
            if (diag.isCrossCollision) {
              mkHtml += '<circle cx="' + px + '" cy="' + py + '" r="6" fill="#ef4444" stroke="#ffffff" stroke-width="1.6" />';
            } else {
              mkHtml += '<circle cx="' + px + '" cy="' + py + '" r="3.2" fill="#f59e0b" />';
            }
          }
        }
        if (diag.isCrossCollision) {
          mkHtml += '<rect x="64" y="' + (iy + 8) + '" width="232" height="24" rx="6" fill="rgba(220,38,38,0.95)" />' +
            '<text x="180" y="' + (iy + 24) + '" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">🔴 同層十字相撞點（PETG 必結瘤刮噴嘴）</text>';
        }
      } else if (state.pattern === 'line') {
        // 直線：第 15 層只畫單向 / 斜線（或橫線），第 16 層只畫正交 \ 斜線（或直線），同層零交叉！
        var lCount = count + 3;
        if (isOddLayer) {
          // 第 15 層：平行橫向走線 + 淡色虛線預示下一層方向
          for (var l1 = 1; l1 <= lCount; l1++) {
            var ly = Math.round(iy + (ih / (lCount + 1)) * l1);
            infHtml += '<line x1="' + ix + '" y1="' + ly + '" x2="' + iright + '" y2="' + ly + '" />';
          }
        } else {
          // 第 16 層：平行縱向走線（與第 15 層在空中正交搭橋，同層零碰撞）
          for (var l2 = 1; l2 <= lCount; l2++) {
            var lx = Math.round(ix + (iw / (lCount + 1)) * l2);
            infHtml += '<line x1="' + lx + '" y1="' + iy + '" x2="' + lx + '" y2="' + ibottom + '" />';
          }
        }
        mkHtml += '<rect x="58" y="' + (iy + 8) + '" width="244" height="24" rx="6" fill="rgba(22,163,74,0.93)" />' +
          '<text x="180" y="' + (iy + 24) + '" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">' +
          (isOddLayer ? '✅ 第15層：單向平行橫線（同層零交叉點！）' : '✅ 第16層：轉90度平行直線（隔層搭成井字！）') + '</text>';
      } else if (state.pattern === 'gyroid') {
        // 螺旋體：平滑連續正弦波浪，第 15 層與第 16 層相位交替偏移，絕不交叉
        var rows = Math.max(2, count);
        var rGap = ih / (rows + 1);
        var flip = isOddLayer ? 1 : -1;
        for (var r = 1; r <= rows; r++) {
          var wy = Math.round(iy + r * rGap);
          var amp = Math.min(15, Math.round(rGap * 0.42));
          var d = 'M ' + ix + ' ' + wy;
          var segs = 6;
          var segW = iw / segs;
          for (var s = 0; s < segs; s++) {
            var qx = Math.round(ix + (s + 0.5) * segW);
            var qy = wy + ((s % 2 === 0) ? (amp * flip) : (-amp * flip));
            var ex = Math.round(ix + (s + 1) * segW);
            d += ' Q ' + qx + ' ' + qy + ', ' + ex + ' ' + wy;
          }
          infHtml += '<path d="' + d + '" fill="none" />';
        }
      } else if (state.pattern === 'adaptive') {
        // 自適應立方體：正中央為大跨度空腔，貼近四面橘色內牆處自動 2 倍細分加密成小方格
        var mx = Math.round(ix + iw / 2);
        var my = Math.round(iy + ih / 2);
        var q1x = Math.round(ix + iw * 0.23);
        var q3x = Math.round(ix + iw * 0.77);
        var q1y = Math.round(iy + ih * 0.25);
        var q3y = Math.round(iy + ih * 0.75);

        // 外環加密格線
        infHtml += '<line x1="' + q1x + '" y1="' + iy + '" x2="' + q1x + '" y2="' + ibottom + '" stroke-width="2.2" />';
        infHtml += '<line x1="' + q3x + '" y1="' + iy + '" x2="' + q3x + '" y2="' + ibottom + '" stroke-width="2.2" />';
        infHtml += '<line x1="' + ix + '" y1="' + q1y + '" x2="' + iright + '" y2="' + q1y + '" stroke-width="2.2" />';
        infHtml += '<line x1="' + ix + '" y1="' + q3y + '" x2="' + iright + '" y2="' + q3y + '" stroke-width="2.2" />';

        // 正中央大空腔（淺黃底凸顯省料大空腔，僅單條主軸穿過）
        infHtml += '<rect x="' + (q1x + 2) + '" y="' + (q1y + 2) + '" width="' + (q3x - q1x - 4) + '" height="' + (q3y - q1y - 4) + '" fill="#fefce8" stroke="#dc2626" stroke-width="2" />';
        infHtml += '<line x1="' + mx + '" y1="' + iy + '" x2="' + mx + '" y2="' + ibottom + '" stroke="#f87171" stroke-width="1.8" stroke-dasharray="5,4" />';
        infHtml += '<line x1="' + ix + '" y1="' + my + '" x2="' + iright + '" y2="' + my + '" stroke="#f87171" stroke-width="1.8" stroke-dasharray="5,4" />';

        // 四周貼近內牆處 2x 密集細分短格
        var subN = 8;
        for (var st = 1; st < subN; st++) {
          var sxTop = Math.round(ix + (iw / subN) * st);
          var sySide = Math.round(iy + (ih / subN) * st);
          infHtml += '<line x1="' + sxTop + '" y1="' + iy + '" x2="' + sxTop + '" y2="' + q1y + '" stroke-width="2" />';
          infHtml += '<line x1="' + sxTop + '" y1="' + q3y + '" x2="' + sxTop + '" y2="' + ibottom + '" stroke-width="2" />';
          infHtml += '<line x1="' + ix + '" y1="' + sySide + '" x2="' + q1x + '" y2="' + sySide + '" stroke-width="2" />';
          infHtml += '<line x1="' + q3x + '" y1="' + sySide + '" x2="' + iright + '" y2="' + sySide + '" stroke-width="2" />';
        }

        mkHtml += '<rect x="' + (mx - 80) + '" y="' + (my - 12) + '" width="160" height="24" rx="6" fill="rgba(15,23,42,0.88)" />' +
          '<text x="' + mx + '" y="' + (my + 4) + '" text-anchor="middle" font-size="11" fill="#fde047" font-weight="bold">🎯 中心大空腔・貼牆2倍加密</text>';
      } else if (state.pattern === 'lightning') {
        // 閃電：中心完全空曠，只從四面橘色內牆往內長出閃電狀分叉枝條
        var reach = isOddLayer ? 0.25 : 0.33;
        var dW = Math.round(iw * reach);
        // 左側牆閃電樹枝
        infHtml += '<path d="M ' + ix + ' ' + Math.round(iy + ih * 0.26) + ' L ' + (ix + Math.round(dW * 0.6)) + ' ' + Math.round(iy + ih * 0.34) + ' L ' + (ix + dW) + ' ' + Math.round(iy + ih * 0.22) + '" fill="none" />';
        infHtml += '<path d="M ' + (ix + Math.round(dW * 0.6)) + ' ' + Math.round(iy + ih * 0.34) + ' L ' + (ix + Math.round(dW * 0.9)) + ' ' + Math.round(iy + ih * 0.48) + '" fill="none" />';
        infHtml += '<path d="M ' + ix + ' ' + Math.round(iy + ih * 0.74) + ' L ' + (ix + Math.round(dW * 0.65)) + ' ' + Math.round(iy + ih * 0.66) + ' L ' + (ix + dW) + ' ' + Math.round(iy + ih * 0.78) + '" fill="none" />';
        // 右側牆閃電樹枝
        infHtml += '<path d="M ' + iright + ' ' + Math.round(iy + ih * 0.30) + ' L ' + (iright - Math.round(dW * 0.6)) + ' ' + Math.round(iy + ih * 0.38) + ' L ' + (iright - dW) + ' ' + Math.round(iy + ih * 0.25) + '" fill="none" />';
        infHtml += '<path d="M ' + (iright - Math.round(dW * 0.6)) + ' ' + Math.round(iy + ih * 0.38) + ' L ' + (iright - Math.round(dW * 0.85)) + ' ' + Math.round(iy + ih * 0.54) + '" fill="none" />';
        infHtml += '<path d="M ' + iright + ' ' + Math.round(iy + ih * 0.76) + ' L ' + (iright - Math.round(dW * 0.65)) + ' ' + Math.round(iy + ih * 0.68) + ' L ' + (iright - dW) + ' ' + Math.round(iy + ih * 0.82) + '" fill="none" />';

        mkHtml += '<rect x="82" y="98" width="196" height="25" rx="6" fill="rgba(15,23,42,0.88)" />' +
          '<text x="180" y="115" text-anchor="middle" font-size="11" fill="#fde047" font-weight="bold">⚡ 肚子中心全空・只從牆邊長樹枝</text>';
      } else if (state.pattern === 'cubic') {
        // 立方體：三向交叉晶格（隨第15/16層偏移），同層有交叉點
        var shift = isOddLayer ? 0 : 10;
        var stepC = Math.round(iw / Math.max(2, count));
        for (var c = 1; c <= count; c++) {
          var cy2 = Math.round(iy + c * sy + shift * 0.4);
          infHtml += '<line x1="' + ix + '" y1="' + cy2 + '" x2="' + iright + '" y2="' + cy2 + '" />';
        }
        for (var dx = -ih; dx < iw + ih; dx += stepC) {
          infHtml += '<line x1="' + (ix + dx + shift) + '" y1="' + iy + '" x2="' + (ix + dx - ih + shift) + '" y2="' + ibottom + '" />';
          infHtml += '<line x1="' + (ix + dx - shift) + '" y1="' + ibottom + '" x2="' + (ix + dx - ih - shift) + '" y2="' + iy + '" />';
        }
        if (diag.isCrossCollision) {
          mkHtml += '<circle cx="180" cy="112" r="7" fill="#ef4444" stroke="#ffffff" stroke-width="1.6" />' +
            '<rect x="64" y="' + (iy + 8) + '" width="232" height="24" rx="6" fill="rgba(220,38,38,0.95)" />' +
            '<text x="180" y="' + (iy + 24) + '" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">🔴 同層三向交叉點（PETG 易結瘤刮頭）</text>';
        }
      } else {
        // 蜂窩與交叉層疊：密集鋸齒轉折路徑
        var hRows = Math.max(3, count);
        var hGap = ih / (hRows + 1);
        var phaseShift = isOddLayer ? 1 : -1;
        for (var hr = 1; hr <= hRows; hr++) {
          var hy = Math.round(iy + hr * hGap);
          var dPath = 'M ' + ix + ' ' + hy;
          var steps = 10;
          var sw = iw / steps;
          for (var st2 = 1; st2 <= steps; st2++) {
            var sx2 = Math.round(ix + st2 * sw);
            var sy2 = hy + ((st2 % 2 === 0) ? (8 * phaseShift) : (-8 * phaseShift));
            dPath += ' L ' + sx2 + ' ' + sy2;
          }
          infHtml += '<path d="' + dPath + '" fill="none" />';
        }
        mkHtml += '<rect x="76" y="98" width="208" height="25" rx="6" fill="rgba(185,28,28,0.92)" />' +
          '<text x="180" y="115" text-anchor="middle" font-size="11" fill="#ffffff" font-weight="bold">🐢 轉折過多頻繁減速・耗時又費料</text>';
      }

      infillG.innerHTML = infHtml;
      markersG.innerHTML = mkHtml;

      if (diag.isCrossCollision) {
        badge.style.color = '#dc2626';
        badge.textContent = '🚨 紅點同層相撞刮噴嘴！';
        caption.innerHTML = '<strong style="color:#dc2626;">刮噴嘴原因：</strong>紅點代表噴嘴在同一層十字路口重複擦過，PETG 極易結瘤發出異音！請改選「📏 直線」或「🌀 螺旋體」。';
      } else if (PATTERN_INFO[state.pattern].hasCross) {
        badge.style.color = '#15803d';
        badge.textContent = '✅ 井字支撐（PLA 適用）';
        caption.innerHTML = '外圈為 <strong>' + state.walls + ' 圈橘色外牆</strong>，內部黃點為井字交點（PLA 印平底盒支撐極穩）。';
      } else {
        badge.style.color = '#15803d';
        badge.textContent = '✅ 同層零交叉（絕不刮噴嘴）';
        caption.innerHTML = '可點上方藍色按鈕切換第 15 / 16 層：每一層線條都<strong>不會在同平面十字相撞</strong>，印 PETG / TPU 最安靜順暢！';
      }
    }

    // =========================================================
    // 8. 繪製右圖：Z 軸側面剖面圖 (100% 真實物理關係：底板 + 垂直外牆 + 內部支撐綠點 + 多層屋頂與塌陷)
    // =========================================================
    function drawCartoonZ(diag) {
      var nozzleG = document.getElementById('z-nozzle');
      var wallsG = document.getElementById('z-walls');
      var pillarsG = document.getElementById('z-pillars');
      var roofG = document.getElementById('z-roof');
      var annG = document.getElementById('z-annotations');
      var clipRect = document.getElementById('z-clip-rect');
      var badge = document.getElementById('z-status-badge');
      var caption = document.getElementById('z-caption');

      // 精準物理座標定義：
      // 模型外邊界：左 x=24, 右 x=336
      // 屋頂頂面 y=52，屋頂底面 (搭橋層 y=70)
      // 內部支撐空腔高度：y=70 (屋頂底面) ~ y=190 (底部實心層頂面)
      // 底部實心層：y=190 ~ y=202 (緊貼熱床平台 y=202)
      var outerLeft = 24;
      var outerRight = 336;
      var roofTopY = 52;
      var roofUndersideY = 70;
      var bottomSolidTopY = 190;
      var bedTopY = 202;
      var cavityH = bottomSolidTopY - roofUndersideY; // 120px

      // 左右橘色垂直外牆：隨 state.walls (2~6圈) 動態變厚，每圈 4.5px
      var loopW = 4.5;
      var totalWallW = state.walls * loopW;
      var inLeft = Math.round(outerLeft + totalWallW);
      var inRight = Math.round(outerRight - totalWallW);
      var innerSpan = inRight - inLeft;

      // 更新側面空腔 <clipPath>，確保紅色支撐結構絕不畫出空腔外
      clipRect.setAttribute('x', inLeft);
      clipRect.setAttribute('y', roofUndersideY);
      clipRect.setAttribute('width', innerSpan);
      clipRect.setAttribute('height', cavityH);

      // 1. 繪製上方移動噴嘴
      var nozzleX = diag.isRoofSagging ? 180 : 248;
      nozzleG.innerHTML =
        '<rect x="' + (nozzleX - 13) + '" y="6" width="26" height="12" rx="3" fill="#334155" />' +
        '<polygon points="' + (nozzleX - 9) + ',18 ' + (nozzleX + 9) + ',18 ' + (nozzleX + 3) + ',28 ' + (nozzleX - 3) + ',28" fill="#f59e0b" />' +
        '<text x="' + (nozzleX + 18) + '" y="16" font-size="10.5" fill="#475569" font-weight="bold">⬅ 噴嘴鋪屋頂</text>';

      // 2. 繪製底部實心層 (y=190~202) 與左右垂直橘色外牆 (y=52~202)
      var wHtml = '';
      // 內部空腔淡米色背景
      wHtml += '<rect x="' + inLeft + '" y="' + roofUndersideY + '" width="' + innerSpan + '" height="' + cavityH + '" fill="#fffbeb" opacity="0.55" />';

      // 底部 3 層橘色實心層
      for (var b = 0; b < 3; b++) {
        var by = bottomSolidTopY + b * 4;
        wHtml += '<rect x="' + inLeft + '" y="' + by + '" width="' + innerSpan + '" height="3.6" fill="#fb923c" stroke="#ea580c" stroke-width="0.6" />';
      }

      // 左右兩側一圈一圈的垂直橘色外皮牆 (從 y=52 一路到底部 y=202)
      for (var w = 0; w < state.walls; w++) {
        var lx = outerLeft + w * loopW;
        var rx = outerRight - (w + 1) * loopW;
        var wColor = (w % 2 === 0) ? '#ea580c' : '#f97316';
        wHtml += '<rect x="' + lx + '" y="' + roofTopY + '" width="' + (loopW - 0.5) + '" height="' + (bedTopY - roofTopY) + '" rx="1.2" fill="' + wColor + '" stroke="#c2410c" stroke-width="0.6" />';
        wHtml += '<rect x="' + rx + '" y="' + roofTopY + '" width="' + (loopW - 0.5) + '" height="' + (bedTopY - roofTopY) + '" rx="1.2" fill="' + wColor + '" stroke="#c2410c" stroke-width="0.6" />';
      }
      // 左牆圈數標籤
      wHtml += '<rect x="' + outerLeft + '" y="122" width="54" height="18" rx="4" fill="rgba(194,65,12,0.94)" />' +
        '<text x="' + (outerLeft + 27) + '" y="134" text-anchor="middle" font-size="10" fill="#ffffff" font-weight="bold">外牆 ' + state.walls + ' 圈</text>';

      wallsG.innerHTML = wHtml;

      // 3. 繪製內部紅色支撐結構 (y=190 -> y=70)，並紀錄所有頂到屋頂底面 y=70 的支撐點 X 座標
      var contactXs = [];
      var pHtml = '';
      var annHtml = '';

      if (state.pattern === 'grid' || state.pattern === 'line') {
        // 網格 / 直線：均勻密集的垂直支撐柱，筆直頂住 y=70 屋頂底面
        var ribCount = Math.max(4, Math.min(11, Math.round(state.density / 3.2) + 2));
        var stepX = innerSpan / (ribCount + 1);
        for (var i = 1; i <= ribCount; i++) {
          var px = Math.round(inLeft + i * stepX);
          contactXs.push(px);
          pHtml += '<line x1="' + px + '" y1="' + bottomSolidTopY + '" x2="' + px + '" y2="' + roofUndersideY + '" stroke="#dc2626" stroke-width="3" />';
          // 若為直線填充，畫出水平交替層橫紋，表現奇偶層正交堆疊
          if (state.pattern === 'line' && i < ribCount) {
            var nextPx = Math.round(inLeft + (i + 1) * stepX);
            for (var ly = roofUndersideY + 16; ly < bottomSolidTopY - 10; ly += 24) {
              pHtml += '<line x1="' + px + '" y1="' + ly + '" x2="' + nextPx + '" y2="' + ly + '" stroke="#fca5a5" stroke-width="1.8" stroke-dasharray="4,3" />';
            }
          }
        }
      } else if (state.pattern === 'gyroid') {
        // 螺旋體：連續正弦波浪柱，只有「波峰」接觸 y=70 屋頂底面！
        // 關鍵物理現象：當密度 <= 8% 時，整個寬度只有 2 個波峰頂到 y=70，中間留出超寬無支撐空檔！
        var crestCount = (state.density <= 8) ? 2 : Math.max(4, Math.min(9, Math.round(state.density / 3)));
        var halfCycles = crestCount * 2 + 1;
        var dxWave = innerSpan / halfCycles;
        var midY = Math.round(roofUndersideY + cavityH * 0.5);

        // 主波浪路徑：精準在每個奇數波峰頂到 y=70 (roofUndersideY)，偶數波谷落到 y=190 (bottomSolidTopY)
        var waveD = 'M ' + inLeft + ' ' + bottomSolidTopY;
        var subWaveD = 'M ' + inLeft + ' ' + midY;
        for (var h = 0; h < halfCycles; h++) {
          var xStart = inLeft + h * dxWave;
          var xMid = Math.round(xStart + dxWave * 0.5);
          var xEnd = Math.round(xStart + dxWave);
          if (h % 2 === 0) {
            // 往上拱起，波峰精準頂住 (xMid, roofUndersideY)
            waveD += ' C ' + Math.round(xStart + dxWave * 0.2) + ' ' + (roofUndersideY + 28) + ', ' + (xMid - 8) + ' ' + roofUndersideY + ', ' + xMid + ' ' + roofUndersideY;
            waveD += ' C ' + (xMid + 8) + ' ' + roofUndersideY + ', ' + Math.round(xEnd - dxWave * 0.2) + ' ' + (roofUndersideY + 28) + ', ' + xEnd + ' ' + bottomSolidTopY;
            contactXs.push(xMid);
          }
          subWaveD += ' Q ' + xMid + ' ' + ((h % 2 === 0) ? (bottomSolidTopY - 10) : (roofUndersideY + 14)) + ', ' + xEnd + ' ' + midY;
        }
        pHtml += '<path d="' + subWaveD + '" fill="none" stroke="#fca5a5" stroke-width="1.8" stroke-dasharray="4,3" />';
        pHtml += '<path d="' + waveD + '" fill="none" stroke="#dc2626" stroke-width="3" />';

        // 若密度 <= 8%，在兩個波峰中間標出「跨度過大無支撐區」
        if (state.density <= 8 && contactXs.length === 2) {
          var gapLeft = contactXs[0];
          var gapRight = contactXs[1];
          var gapCenter = Math.round((gapLeft + gapRight) / 2);
          annHtml += '<line x1="' + (gapLeft + 6) + '" y1="92" x2="' + (gapRight - 6) + '" y2="92" stroke="#dc2626" stroke-width="2" stroke-dasharray="3,3" />' +
            '<rect x="' + (gapCenter - 62) + '" y="97" width="124" height="20" rx="5" fill="rgba(220,38,38,0.92)" />' +
            '<text x="' + gapCenter + '" y="111" text-anchor="middle" font-size="10.5" fill="#ffffff" font-weight="bold">↔ 跨度過大無支撐！</text>';
        }
      } else if (state.pattern === 'adaptive') {
        // 自適應立方體：底部為大跨度稀疏 X 桁架（留出中央大空腔省料），上半部 1分2、2分4 長出密集 Y 型樹枝緊密托住 y=70！
        var ySplit1 = Math.round(roofUndersideY + cavityH * 0.54);
        var ySplit2 = Math.round(roofUndersideY + cavityH * 0.24);
        var roots = [
          Math.round(inLeft + innerSpan * 0.24),
          Math.round(inLeft + innerSpan * 0.76)
        ];

        for (var rIdx = 0; rIdx < roots.length; rIdx++) {
          var rxNode = roots[rIdx];
          var wallX = (rIdx === 0) ? inLeft : inRight;
          // 下半部粗主幹與斜撐
          pHtml += '<line x1="' + rxNode + '" y1="' + bottomSolidTopY + '" x2="' + rxNode + '" y2="' + ySplit1 + '" stroke="#dc2626" stroke-width="3.2" />';
          pHtml += '<line x1="' + wallX + '" y1="' + (bottomSolidTopY - 14) + '" x2="' + rxNode + '" y2="' + ySplit1 + '" stroke="#dc2626" stroke-width="2.5" />';

          // 中層 1 分 2 樹枝
          var off1 = Math.round(innerSpan * 0.13);
          var mNodes = [rxNode - off1, rxNode + off1];
          for (var m = 0; m < mNodes.length; m++) {
            var mxNode = mNodes[m];
            pHtml += '<line x1="' + rxNode + '" y1="' + ySplit1 + '" x2="' + mxNode + '" y2="' + ySplit2 + '" stroke="#dc2626" stroke-width="2.6" />';

            // 貼近屋頂處 2 分 4 加密細分叉，頂住 y=70
            var off2 = Math.round(innerSpan * 0.055);
            var t1 = mxNode - off2;
            var t2 = mxNode + off2;
            pHtml += '<line x1="' + mxNode + '" y1="' + ySplit2 + '" x2="' + t1 + '" y2="' + roofUndersideY + '" stroke="#dc2626" stroke-width="2.2" />';
            pHtml += '<line x1="' + mxNode + '" y1="' + ySplit2 + '" x2="' + t2 + '" y2="' + roofUndersideY + '" stroke="#dc2626" stroke-width="2.2" />';
            contactXs.push(t1, t2);
          }
        }
        // 標出底部中央省料大空腔
        var midCavityX = Math.round(inLeft + innerSpan * 0.5);
        annHtml += '<rect x="' + (midCavityX - 68) + '" y="' + (bottomSolidTopY - 32) + '" width="136" height="22" rx="5" fill="rgba(15,23,42,0.85)" />' +
          '<text x="' + midCavityX + '" y="' + (bottomSolidTopY - 17) + '" text-anchor="middle" font-size="10.5" fill="#fde047" font-weight="bold">🎯 下空省料・上密撐屋頂</text>';
      } else if (state.pattern === 'lightning') {
        // 閃電：底部與中央完全空曠！只從左右兩側橘色外牆往上斜向長出閃電樹枝托住屋頂兩端，中央大面積懸空
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
        annHtml += '<rect x="' + (midX2 - 74) + '" y="' + (bottomSolidTopY - 34) + '" width="148" height="22" rx="5" fill="rgba(15,23,42,0.85)" />' +
          '<text x="' + midX2 + '" y="' + (bottomSolidTopY - 19) + '" text-anchor="middle" font-size="10.5" fill="#fde047" font-weight="bold">⚡ 中心全空・僅靠牆長閃電枝</text>';
      } else {
        // 立方體 / 蜂窩 / 交叉層疊：45 度交叉 X 型三角形桁架
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

      pillarsG.innerHTML = pHtml;

      // 整理屋頂下方所有支撐點（左內牆 + 內部支架綠點 + 右內牆）
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

      // 4. 繪製多層藍色屋頂 (Top shell layers, 位於 y=52 ~ y=70)
      var rHtml = '';
      var roofLayers = state.topLayers || 4;
      var roofSpanH = roofUndersideY - roofTopY; // 18px
      var layerStepH = roofSpanH / roofLayers;
      var hasSagSpan = false;

      for (var lIdx = 0; lIdx < roofLayers; lIdx++) {
        // lIdx = 0 是最上方表面層，lIdx = roofLayers - 1 是最下方第 1 層搭橋層 (y=70)
        var ly2 = Math.round((roofTopY + (lIdx + 0.5) * layerStepH) * 10) / 10;
        var depthRatio = (lIdx + 1) / roofLayers; // 越底下的搭橋層下垂越深
        var dRoof = 'M ' + inLeft + ' ' + ly2;

        for (var seg = 0; seg < supports.length - 1; seg++) {
          var sx1 = supports[seg];
          var sx2 = supports[seg + 1];
          var spanW = sx2 - sx1;
          var midSpanX = Math.round((sx1 + sx2) / 2);

          if (diag.isRoofSagging && spanW > 56) {
            hasSagSpan = true;
            // 控制點往下加 (+droop)，呈現真實地心引力下垂吊橋與頂面凹洞！
            var maxDroop = Math.min(34, (spanW - 40) * 0.45);
            var layerDroop = Math.round(maxDroop * (0.45 + 0.55 * depthRatio));
            dRoof += ' Q ' + midSpanX + ' ' + Math.round(ly2 + layerDroop) + ', ' + sx2 + ' ' + ly2;

            // 在最頂面標出「⚠️ 踩空塌陷凹洞」
            if (lIdx === 0) {
              var dipY = Math.round(ly2 + layerDroop * 0.48);
              annHtml += '<circle cx="' + midSpanX + '" cy="' + dipY + '" r="4" fill="#dc2626" />' +
                '<rect x="' + (midSpanX - 58) + '" y="28" width="116" height="19" rx="5" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5" />' +
                '<text x="' + midSpanX + '" y="41" text-anchor="middle" font-size="10.5" fill="#dc2626" font-weight="bold">⚠️ 踩空塌陷凹洞</text>';
            }
          } else {
            dRoof += ' L ' + sx2 + ' ' + ly2;
          }
        }

        var strokeColor = hasSagSpan
          ? (lIdx === 0 ? '#dc2626' : '#f87171')
          : (lIdx === 0 ? '#0284c7' : '#38bdf8');
        var strokeW = (lIdx === 0) ? 3.2 : 2.2;
        rHtml += '<path d="' + dRoof + '" fill="none" stroke="' + strokeColor + '" stroke-width="' + strokeW + '" stroke-linecap="round" />';
      }

      // 5. 在屋頂底面 y=70 畫出每一顆「🟢 綠色支撐接觸點」
      for (var gIdx = 1; gIdx < supports.length - 1; gIdx++) {
        var gx = supports[gIdx];
        annHtml += '<circle cx="' + gx + '" cy="' + roofUndersideY + '" r="4" fill="#16a34a" stroke="#ffffff" stroke-width="1.3" />';
      }

      if (hasSagSpan) {
        badge.style.color = '#dc2626';
        badge.textContent = '🚨 支撐太遠・屋頂下垂凹陷！';
        caption.innerHTML = '<strong style="color:#dc2626;">為什麼屋頂會凹下去？</strong>請看屋頂底面（y=70）只有少數幾顆<strong>🟢綠點</strong>頂住，中間跨距過大，導致第一層搭橋塑膠受地心引力往下垂墜，連帶使頂面凹出坑洞！';
      } else {
        annHtml += '<rect x="58" y="28" width="244" height="19" rx="5" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.5" />' +
          '<text x="180" y="41" text-anchor="middle" font-size="10.5" fill="#15803d" font-weight="bold">✅ 🟢支撐接觸點密集，' + roofLayers + ' 層藍色屋頂平整完美</text>';

        badge.style.color = '#15803d';
        badge.textContent = '✅ 屋頂平整無塌陷';
        caption.innerHTML = '<strong>結構超清楚：</strong>左右為 <strong>' + state.walls + ' 圈橘色垂直外牆</strong>，內部紅柱頂端的<strong>🟢綠點密集托住上方 ' + roofLayers + ' 層藍色屋頂</strong>，搭橋跨距短、表面平整漂亮！';
      }

      roofG.innerHTML = rHtml;
      annG.innerHTML = annHtml;
    }

