    // =========================================================
    // 1. 工程實驗室填充圖案資料庫 (Pattern Database)
    // =========================================================
    var PATTERN_INFO = {
      adaptive: {
        name: '🎯 自適應立方體 (Adaptive Cubic)',
        hasCross: true,
        plainDesc: '底部與中心留出大空腔省時省料，越靠近屋頂與外牆自動像樹枝一樣 1分2、2分4 加密托住表面！大型擺件首選。'
      },
      grid: {
        name: '🕸️ 網格 (Grid)',
        hasCross: true,
        plainDesc: '垂直井字支撐柱均勻密集，即使 10% 低密度也能穩穩托住大面積平頂！但同層有十字交叉點，僅限 PLA 使用，印 PETG 必刮噴頭。'
      },
      line: {
        name: '📏 直線 (Line / Rectilinear)',
        hasCross: false,
        plainDesc: '奇數層只畫橫線、偶數層只畫直線，同一層絕對不十字相撞！兼具密集平頂支撐與不刮噴嘴特性，PETG 印平底盒首選。'
      },
      gyroid: {
        name: '🌀 螺旋體 (Gyroid)',
        hasCross: false,
        plainDesc: '三維波浪麻花結構，三軸抗扭轉與耐反覆折彎最強，且同層零交叉絕不刮噴嘴！注意：印平頂或薄壁時密度需 ≥12%，否則波峰隔太遠會踩空。'
      },
      cubic: {
        name: '🧊 立方體 (Cubic)',
        hasCross: true,
        plainDesc: '三維傾斜封閉三角晶格，各方向抗剪切剛性極高，適合 PLA 高強度機械結構件（同層有交叉點）。'
      },
      lightning: {
        name: '⚡ 閃電 (Lightning)',
        hasCross: false,
        plainDesc: '底部與中心完全空曠！只從左右外牆斜向長出閃電狀樹枝去托住頂部尖端，極致省時省料，但完全無抗壓強度且不適合大面積平頂。'
      },
      honeycomb: {
        name: '🐝 蜂窩 / 3D蜂窩 (Honeycomb)',
        hasCross: false,
        plainDesc: '⚠️ 避坑提醒：六角形轉折繁複，噴頭頻繁減速，實測比同強度圖案多消耗約 25% 線材且多花 20 分鐘以上，一般被螺旋體與立方體取代。'
      },
      crosshatch: {
        name: '🐢 交叉層疊 (Cross Hatch)',
        hasCross: false,
        plainDesc: '⚠️ 避坑提醒：路徑細碎曲折，工程實測在相同模型下耗時最長且耗料最多（雙料墊底），強烈建議改用螺旋體或自適應立方體。'
      }
    };

    // =========================================================
    // 2. 六大日常物品預設配方庫 (Everyday Item Presets)
    // =========================================================
    var ITEM_PRESETS = {
      statue_large: {
        title: '🗿 大型公仔 / 擺飾',
        filament: 'pla',
        filamentReason: 'PLA 細節表現最銳利、表面光滑且好印不翹邊',
        walls: 2,
        topLayers: 4,
        density: 8,
        pattern: 'adaptive',
        roofShape: 'curve',
        size: 'large',
        useType: 'statue'
      },
      desk_box: {
        title: '🍱 桌面收納盒 / 平底盤',
        filament: 'pla',
        filamentReason: 'PLA 硬度高、大面積平底搭橋最平整不塌陷',
        walls: 2,
        topLayers: 5,
        density: 10,
        pattern: 'grid',
        roofShape: 'flat',
        size: 'large',
        useType: 'box'
      },
      folding_box: {
        title: '🧺 折疊收納箱 (平底板+活動側板)',
        filament: 'pla',
        filamentReason: '建議使用左側【對象 Objects】功能：底板設網格防塌、側板設螺旋體抗折彎',
        walls: 3,
        topLayers: 5,
        density: 12,
        pattern: 'gyroid',
        roofShape: 'flat',
        size: 'large',
        useType: 'flex'
      },
      clip_flex: {
        title: '📎 封口夾 / 活動卡扣',
        filament: 'petg',
        filamentReason: 'PETG 具極佳韌性與抗疲勞度，反覆掰開上千次也不脆斷',
        walls: 3,
        topLayers: 4,
        density: 15,
        pattern: 'gyroid',
        roofShape: 'flat',
        size: 'small',
        useType: 'flex'
      },
      heavy_hook: {
        title: '🪝 承重掛鉤 / 結構支架',
        filament: 'petg',
        filamentReason: '4 圈厚外皮提供超強抗彎力學，搭配 PETG 韌性與螺旋體零交叉不刮噴頭',
        walls: 4,
        topLayers: 5,
        density: 20,
        pattern: 'gyroid',
        roofShape: 'flat',
        size: 'large',
        useType: 'strong'
      },
      car_outdoor: {
        title: '☀️ 車內 / 戶外耐曬零件',
        filament: 'petg',
        filamentReason: 'PLA 放車內曬太陽會軟化變形！必須用耐溫 PETG 搭配零交叉「直線」填充',
        walls: 3,
        topLayers: 5,
        density: 15,
        pattern: 'line',
        roofShape: 'flat',
        size: 'large',
        useType: 'box'
      }
    };

    // =========================================================
    // 3. 全域應用程式狀態 (Global State)
    // =========================================================
    var state = {
      mode: 'items',          // 'items' | 'qa'
      selectedItem: 'desk_box',
      itemTitle: '🍱 桌面收納盒 / 平底盤',
      filament: 'pla',        // 'pla' | 'petg' | 'tpu'
      filamentReason: 'PLA 硬度高、大面積平底搭橋最平整不塌陷',
      walls: 2,
      topLayers: 5,
      density: 10,
      pattern: 'grid',
      roofShape: 'flat',      // 'flat' | 'curve' | 'sharp'
      size: 'large',          // 'large' | 'small'
      useType: 'box',         // 'statue' | 'box' | 'flex' | 'strong'
      previewLayer: 15,       // 15 (奇數層) | 16 (偶數層)
      activeTrap: 0,          // 0=正常最佳, 1=慘劇1, 2=慘劇2, 3=慘劇3
      qa: {
        use: 'box',
        shape: 'flat',
        size: 'large',
        env: 'indoor'
      }
    };

