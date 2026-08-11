import { Project, Review } from './types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'qilou-yanduo',
    slug: 'qilou-yanduo',
    visibility: 'public',
    isDemo: true,
    title: '《骑楼·凝固的烟火》',
    scale: '1:12',
    category: '岭南市井烟火',
    status: 'Completed',
    dimensions: '240 * 60 * 75 cm',
    materials: 'PVC (75%), 苯板 (10%), 复合材料 (15%)',
    timeSpent: 3600,
    createdAt: '2025-06-01T00:00:00Z',
    period: '2024/09 —— 2025/06',
    inspiration: '揭阳骑楼古城',
    authors: ['邓政松', '黄铭涛', '夏小军', '李泽楠', '彭宇辰', '郑钰玲', '赵忱璐'],
    completionPercent: 100,
    description: '这项耗时长达3600小时、比例为 1:12 的殿堂级微缩工程，是对潮汕揭阳老城两百米骑楼风貌的极致浓缩与艺术复刻。作品长度达2.4米，使用真砖土浆抹平技巧还原斑驳墙皮。不仅重现古城“拱底廊”、“石构柱”、“女儿墙”等硬核古建特征，更是将老字号茶肆、闺阁书屋、烟火天井的市井人情温热还原。自研防漏电微型暖光LED灯组点亮时，整座建筑宛如一尊悬挂在时间长河里的温热艺术品，彻底将“烟火气”定格。',
    coverUrl: 'https://images.unsplash.com/photo-1547989453-11e67ffb3885?q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1547989453-11e67ffb3885?q=80&w=1200', // Traditional street lit glow
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=1200', // Teahouse interior glow
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200', // Bedroom shadow vibe
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200', // Cozy classic window
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200'  // Atmospheric back yard
    ],
    worksteps: [
      { 
        id: 'ql-1', 
        name: '阶段 01. 古城结构测绘与大比例框定', 
        status: 'DONE', 
        detail: '多次前往揭阳考察测绘，运用1:12比例绘制CAD图纸，采用高压硬PVC板建立2.4米骑楼底座基本框结构。',
        image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=800'
      },
      { 
        id: 'ql-2', 
        name: '阶段 02. 天井及一至三楼内部硬装拼装', 
        status: 'DONE', 
        detail: '用真空铸泥技术仿制中式红砖，并在阁楼内装入自制仿真竹编天花板及立式红漆屏风。',
        image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800'
      },
      { 
        id: 'ql-3', 
        name: '阶段 03. 隐蔽敷线温控柔光线路通航', 
        status: 'DONE', 
        detail: '使用0.2mm超细铜漆包线，将24个暖光LED隐藏于天花板及壁凹之内，独立可分控。',
        image: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=800'
      },
      { 
        id: 'ql-4', 
        name: '阶段 04. 细节陈设雕工与风化旧化上色', 
        status: 'DONE', 
        detail: '立体镜下手工雕砌茶肆茶碗、绣阁铜镜，用稀释法旧化水泥牌匾、模拟老斑驳墙皮剥落。',
        image: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=800'
      }
    ],
    rooms: [
      {
        id: 'room-teahouse',
        name: '一楼 · 潮汕工夫茶肆',
        coverUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800',
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800'
        ],
        description: '工夫茶肆是骑楼一楼的核心空间（用户可通过此接口在此处替换细节图与详细文字介绍）。青砖地面上陈设着1:12比例纯手工打磨的袖珍酸枝木八仙桌与太师椅。茶盘上整齐置放着比指甲盖还小的红泥小火炉、高分子仿真白炭、袖珍手绘青花瓷“若琛杯”与“孟臣罐”。茶壶壶嘴甚至能倒出凝结态的环氧树脂茶汤，细节考究逼真，还原了极其考究的潮俗工夫茶道。',
        detailsList: [
          '1:12 珍品酸枝木微缩八仙桌椅组',
          '手捏超细红泥小火炉与迷你青花茶具',
          '环氧树脂凝结茶汤溢流仿生艺术效果',
          '灶壁隐藏式微型超声排湿孔线'
        ]
      },
      {
        id: 'room-bedroom',
        name: '二楼 · 雕花绣阁闺房',
        coverUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800',
          'https://images.unsplash.com/photo-1519642918688-7e43d1a01de9?q=80&w=800'
        ],
        description: '绣阁位于骑楼的中层，展现出传统大户闺秀静美高雅的日常生活闺趣。房内设有一扇六折手绘剔红双面浮雕老屏风横于中部，木制朱底贴金千工架子床挂有极薄的天然生丝蕾丝微缩帐幔。雕花木镜台上陈设着微型黄铜抛光面台镜、精致的刺绣锦缎首饰盒以及微型泥塑彩绘胭脂罐，散发出细腻温馨的岭南闺阁美。',
        detailsList: [
          '纯手工特割手绘贴金雕花朱红六折中式屏风',
          '1:12 镂雕金漆雕花大架子床与天然生丝古风罗帐',
          '超精细研磨黄铜面微型梳妆台台镜',
          '实木书函首饰箱及老纸笺账本微缩册子'
        ]
      },
      {
        id: 'room-study',
        name: '三楼 · 阁楼书斋旧学',
        coverUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800',
          'https://images.unsplash.com/photo-1456428746267-a1756408f782?q=80&w=800'
        ],
        description: '书斋设于顶层人字坡双斜顶下的老虎天窗里。斜照进来的阳光（由顶层高精密温控射灯模拟）洒在整排斑驳的松木多宝柜书架上，架上整齐堆积着上百本由极薄宣纸纯手工折页、打孔并缝制的微型线装古书折子。书案上文房四宝皆全：狼毫笔、研制而出的端砚、铜制刻花镇纸与精致的水注台，书香墨染之气跃然眼前。',
        detailsList: [
          '近百本纯手工折页切边、五孔丝线装订宣纸古籍卷轴',
          '用微刻天然灰石雕琢而成的微型蓄水端砚台组',
          '斜屋顶采光老虎天窗，完美构筑模型打光戏剧效果',
          '桌上微型青玉香插，备有微香熏陶'
        ]
      },
      {
        id: 'room-kitchen',
        name: '后院 · 烟火天井灶房',
        coverUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800',
        images: [
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800'
        ],
        description: '位于骑楼后堂天井拐角的露天柴火大灶台厨房。炉膛抹灰自然开裂，灶上堆叠着几层比指尖宽不了多少的、竹条纯手工篾编起来的微型小蒸笼，开启机罩能闻到干香草之气。料理案板上放着微型精钢剁菜刀，旁边是切好并点缀有环氧凝胶露水珠的微缩大葱和袖珍萝卜。灶膛深处特设微芯片控制的红光LED，能极逼真地模拟微温木炭不规则闪烁复燃的暖调火焰，充满了浓郁温暖的市井炊烟风。',
        detailsList: [
          '手工沙灰涂刷土灶基底，配有迷你铁盖与烧黑大铁镬',
          '工艺极为复杂的1:12纯手工微编天然竹篾多层蒸笼',
          '特制呼吸频率LED红光模拟灶底柴火余烬火星闪烁效果',
          '石板水井案台，手摇辘轳木桶水桶微模组'
        ]
      }
    ]
  },
  {
    id: 'shangbu-laojie',
    slug: 'shangbu-laojie',
    visibility: 'public',
    isDemo: true,
    title: '《百载商埠·海风旧影》',
    scale: '1:12',
    category: '西洋折衷主义',
    status: 'Completed',
    dimensions: '180 * 50 * 70 cm',
    materials: 'PVC (70%), 实木复合板 (20%), 树脂 (10%)',
    timeSpent: 2800,
    createdAt: '2024-08-15T00:00:00Z',
    period: '2023/11 —— 2024/08',
    inspiration: '汕头小公园开埠区老骑楼',
    authors: ['邓政松', '黄铭涛', '夏小军'],
    completionPercent: 100,
    description: '以汕头小公园开埠区的放射性网格骑楼街道为参考，再现上世纪二十年代商业口岸风貌的演示微缩场景。180厘米的模型陈列外探欧式浮雕阳台。路灯采用高透树脂封装微型 LED 管，街角设置手工仿红木电线杆、绝缘子及线束，墙角月份牌广告纸和书信则以做旧工艺表现岁月痕迹。',
    coverUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200'
    ],
    worksteps: [
      { id: 'sb-1', name: '阶段 01. 扇形欧风外挑阳台精确定位', status: 'DONE', detail: '精确计算放射角度，制作全包裹弧状PVC护栏并贴合汕头雕花柱式。', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800' },
      { id: 'sb-2', name: '阶段 02. 民国霓虹小广告移洗工艺', status: 'DONE', detail: '特制高分辨率水贴纸进行旧化转印，完美铺设在洗石子外立面上。', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800' },
      { id: 'sb-3', name: '阶段 03. 空中架线与陶瓷绝缘子微雕', status: 'DONE', detail: '用粘土塑形、上白磁漆制造30多颗只有2mm的陶瓷绝缘子，挂接紫铜细漆电线束。', image: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=800' }
    ],
    rooms: [
      {
        id: 'room-barbershop',
        name: '一楼 · 怀旧理发老厅',
        coverUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800',
        images: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800'],
        description: '理发老厅展示了街边一角。配有1:12机械可调高低铜制椅托皮椅，旋转红蓝白理发老转灯。镜台旁放有极精细的医用剪刀、吹风筒模型，甚至是桌上几分钱的水泥印钞发油瓶，充满怀旧质感。',
        detailsList: ['手动黄铜可升降真皮理发椅模型', '发光微型电驱动旋转理发灯柱', '微型复古烫发罩与爽身粉罐']
      }
    ]
  },
  {
    id: 'chaozhou-paifang',
    slug: 'chaozhou-paifang',
    visibility: 'public',
    isDemo: true,
    title: '《古邑余晖·斑驳牌坊》',
    scale: '1:12',
    category: '古典金石微刻',
    status: 'Completed',
    dimensions: '120 * 45 * 65 cm',
    materials: '改性石膏 (60%), 微型植物介质 (10%), PVC (30%)',
    timeSpent: 1800,
    createdAt: '2023-10-10T00:00:00Z',
    period: '2023/04 —— 2023/10',
    inspiration: '潮州古牌坊街明清石雕牌楼',
    authors: ['李泽楠', '彭宇辰', '郑钰玲'],
    completionPercent: 100,
    description: '选用华南著名的潮州牌坊街双层雕刻老石坊为原型，这是一次对于古代石法建筑卯榫咬合和微雕美学的非凡挑战。模型主体摒弃了塑料和木材，独创地使用加入了特种纤维防裂裂纹的自调配改性石膏浆进行实心浇铸。在长达百天的工期中，雕刻师纯手工在显微镜下雕砌牌楼屋顶下密密麻麻的五叠斗拱、垂花柱、卷草浮雕花纹以及高处的龙吻。使用深黑色与苔藓绿珐琅干扫多次，完美复刻石牌坊立于韩江畔百年风霜雨雪的厚重风化质感。',
    coverUrl: 'https://images.unsplash.com/photo-1548625361-155deee223d5?q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1548625361-155deee223d5?q=80&w=1200',
      'https://images.unsplash.com/photo-1456428746267-a1756408f782?q=80&w=1200'
    ],
    worksteps: [
      { id: 'pf-1', name: '阶段 01. 砂岩多分子骨架研发及浇筑', status: 'DONE', detail: '调配特种纤维改性石膏，以完美杜绝风干收缩裂隙，浇筑重型牌楼石立柱。', image: 'https://images.unsplash.com/photo-1548625361-155deee223d5?q=80&w=800' },
      { id: 'pf-2', name: '阶段 02. 高阶立体显微镜下多重斗拱凿花', status: 'DONE', detail: '用牙科专用合金钢旋转刻刀，一刀刀刨削出极繁多层中式斗拱与卷云浮雕。', image: 'https://images.unsplash.com/photo-1456428746267-a1756408f782?q=80&w=800' },
      { id: 'pf-3', name: '阶段 03. 青苔附着与极微干干扫渗色', status: 'DONE', detail: '天然青干粉加极稀亚克力粘连剂，在立柱根部及横梁阴面敷设出立体感青苔。', image: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=800' }
    ],
    rooms: [
      {
        id: 'room-woodwork',
        name: '牌坊梁顶 · 斗拱微刻',
        coverUrl: 'https://images.unsplash.com/photo-1548625361-155deee223d5?q=80&w=800',
        images: ['https://images.unsplash.com/photo-1548625361-155deee223d5?q=80&w=800'],
        description: '这处石牌坊高悬的斗拱是中式古代木建筑的明珠。石膏微刻的雀替、斗拱错落有致，纯手工雕成高1cm的石雕异兽，细节在显微放大镜下线条坚挺遒劲。',
        detailsList: ['1:12 改性石膏显微微雕千重斗拱结构', '斑驳干粉吸附表现饱尽沧桑的石风化肌理', '雀替处的传统潮汕人物潮剧历史戏出浮雕']
      }
    ]
  },
  {
    id: 'hanjiang-liaoshe',
    slug: 'hanjiang-liaoshe',
    visibility: 'public',
    isDemo: true,
    title: '《韩江渔火·水上茶寮》',
    scale: '1:12',
    category: '水上水乡生态',
    status: 'Completed',
    dimensions: '150 * 60 * 50 cm',
    materials: '纯原竹木 (40%), 环氧树脂 (30%), 聚苯发泡 (30%)',
    timeSpent: 2200,
    createdAt: '2023-03-15T00:00:00Z',
    period: '2022/08 —— 2023/03',
    inspiration: '韩江南堤旧时临水竹寮与疍家船坞',
    authors: ['夏小军', '李泽楠', '赵忱璐', '郑钰玲'],
    completionPercent: 100,
    description: '重现了韩江之畔即将消失的水上木结构悬空吊脚茶寮与疍民住家生活。茶寮依靠二十余根极细的微型黑木桩斜刺插入江底沙石（自制质感底块）。底部宽阔的流动水面历经漫长的分步固化工艺，将42层加入了微细染料和多层磨砂光亮粉的环保进口高分子透明环氧树脂进行重力层灌。水面上凝结出极其真实的波光纹理，与水下生锈的铁锚、乱石藻类交相映衬。茶寮内部悬挂着微型红纸灯笼，透过昏黄的光影折射水面，充满了悠然与寂静之美。',
    coverUrl: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?q=80&w=1200',
    images: [
      'https://images.unsplash.com/photo-1478147427282-58a87a120781?q=80&w=1200',
      'https://images.unsplash.com/photo-1508847154043-be12a26c86c5?q=80&w=1200'
    ],
    worksteps: [
      { id: 'ls-1', name: '阶段 01. 原木支护吊脚斜桩穿刺组装', status: 'DONE', detail: '选用老楠竹刨出极细竹篾搭建茅寮主肋与悬空底部杉木吊脚支撑斜柱。', image: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?q=80&w=800' },
      { id: 'ls-2', name: '阶段 02. 厚度水面42次循环环氧固化分流', status: 'DONE', detail: '分层添加孔雀蓝和生绿染料，耗时七周分42次对多层低发热环氧树脂进行阶梯固化。', image: 'https://images.unsplash.com/photo-1508847154043-be12a26c86c5?q=80&w=800' },
      { id: 'ls-3', name: '阶段 03. 微型发烟器与红纸纸罩灯笼通电', status: 'DONE', detail: '将微弱超声压雾芯片潜入灶台上茶水罐中，按动开关能在烟囱口袅袅吐出湿润冷水汽。', image: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?q=80&w=800' }
    ],
    rooms: [
      {
        id: 'room-boat',
        name: '水中吊脚 · 茅草茶寮',
        coverUrl: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?q=80&w=800',
        images: ['https://images.unsplash.com/photo-1478147427282-58a87a120781?q=80&w=800'],
        description: '茶铺一角。微型的枯草被一草一木地粘在斜瓦上，窗子半掩，里面的竹茶几放着煮好的茶水。地板缝细能隐约看到下面澄蓝透明、流动汹涌的水浪和游离鱼群，空间张力堪称绝妙。',
        detailsList: ['手工干枯仿真松针茅草屋顶铺设', '吊脚楼地板缝隙可透澈漏视透明环氧树脂深邃江面', '1:12 楠竹手编精致竹编茶几与竹椅']
      }
    ]
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    status: 'approved',
    isDemo: true,
    reviewerName: '演示访客 A',
    rating: 5,
    projectName: '《骑楼·凝固的烟火》',
    comment: '这是一条用于展示评论排版与评分功能的演示内容，不代表真实客户或专业机构评价。',
    createdAt: '2026-05-26T14:22:00Z'
  },
  {
    id: 'rev-2',
    status: 'approved',
    isDemo: true,
    reviewerName: '演示访客 B',
    rating: 5,
    projectName: '《韩江渔火·水上茶寮》',
    comment: '这是一条演示评论，用于确认项目名称、星级和正文在页面中的显示效果。',
    createdAt: '2026-05-27T09:12:00Z'
  },
  {
    id: 'rev-3',
    status: 'approved',
    isDemo: true,
    reviewerName: '演示访客 C',
    rating: 5,
    projectName: '工作室总体打分',
    comment: '这是一条工作室总体评分的演示数据，不代表真实销售状态、客户反馈或商业成绩。',
    createdAt: '2026-05-27T12:05:00Z'
  }
];
