// ============================================================
// 场景配置库 — 制度身份驱动的多智能体博弈
// ============================================================

import type { ScenarioConfig } from './types';

// ============================================================
// 场景一：中央环保督察
// ============================================================

export const environmentalInspectionScenario: ScenarioConfig = {
  id: 'environmental_inspection',
  title: '中央环保督察政策协调模拟',
  domain: 'environmental_policy',
  description:
    '模拟中央环保督察过程中，中央督察组、省级政府、职能部门之间的政策协调与执行博弈过程。',

  agents: [
    {
      id: 'central_inspection',
      name: '中央环保督察组',
      role: '中央督察机构，代表党中央国务院监督地方环保执行',
      level: 'central',
      position: {
        level: 'central',
        powerType: 'hierarchical',
        jurisdiction: ['environmental_enforcement', 'local_accountability', 'policy_supervision'],
        vetoPower: true,
        rank: 5,
      },
      incentives: [
        { type: 'politicalSignal', intensity: 0.95, source: '党中央督察任务' },
        { type: 'professionalReputation', intensity: 0.7, source: '督察成效' },
        { type: 'promotionPressure', intensity: 0.3, source: '政治声誉' },
        { type: 'fiscalIncentive', intensity: 0.2, source: '无财政压力' },
        { type: 'accountabilityRisk', intensity: 0.2, source: '低风险' },
      ],
      responsibilities: {
        coreMandate: '代表党中央国务院对省级党委和政府开展环保督察，发现问题、形成震慑、推动整改',
        actionGoals: [
          '发现并公开地方环保突出问题',
          '推动地方限期整改并建立长效机制',
          '对失职渎职行为提出问责建议',
        ],
        informalPractices: [
          '通过约谈省委书记/省长施加政治压力',
          '利用媒体曝光形成舆论震慑',
          '以"回头看"机制防止整改反弹',
        ],
      },
      constraintSet: {
        centralConstraints: ['督察结论需经党中央审批', '不能直接取代地方执法权'],
        fiscalConstraints: ['督察经费有预算上限'],
        institutionalConstraints: ['必须在60天内完成督察任务', '督察报告需向社会公开'],
        socialConstraints: ['需回应公众环保诉求，避免舆情失控'],
      },
      preferences: {
        policy_goal_achievement: 0.9,
        political_stability: 0.6,
        institutional_authority: 0.8,
        accountability: 0.85,
      },
      constraints: [
        '不能直接取代地方执法权',
        '必须在60天内完成督察任务',
        '督察报告需向社会公开',
      ],
      resources: {
        political_capital: 0.9,
        administrative_capacity: 0.5,
        information_access: 0.7,
        legal_authority: 0.8,
      },
      power: {
        agendaSetting: 0.9,
        veto: 0.8,
        resourceAllocation: 0.6,
        informationControl: 0.7,
        personnelMobility: 0.7,
        enforcement: 0.8,
        personnel: 0.7,
      },
      discourseStyle: {
        formalityLevel: 0.95,
        deferenceToSuperior: 0.3,
        ambiguityPreference: 0.15,
        consensusSeeking: 0.5,
        conflictAvoidance: 0.2,
        technicalVocabulary: 0.6,
        partyLanguageUsage: 0.9,
        localInterestEmphasis: 0.1,
        nationalAlignment: 0.95,
      },
    },
    {
      id: 'provincial_government',
      name: '河北省政府',
      role: '省级行政机构，经济发展与环保执行的双重承担者',
      level: 'provincial',
      position: {
        level: 'provincial',
        powerType: 'hierarchical',
        jurisdiction: ['economic_development', 'environmental_protection', 'fiscal_management', 'social_stability'],
        vetoPower: false,
        subordinateTo: 'central_inspection',
        rank: 3,
      },
      incentives: [
        { type: 'promotionPressure', intensity: 0.8, source: '晋升锦标赛' },
        { type: 'fiscalIncentive', intensity: 0.7, source: '地方财政压力' },
        { type: 'politicalSignal', intensity: 0.7, source: '中央督察要求' },
        { type: 'accountabilityRisk', intensity: 0.75, source: '问责风险' },
        { type: 'professionalReputation', intensity: 0.4, source: '政绩声誉' },
      ],
      responsibilities: {
        coreMandate: '统筹本省经济社会发展与生态环境保护，落实中央环保督察整改要求',
        actionGoals: [
          '在满足环保要求的同时尽量保护经济增长',
          '控制整改成本，避免大规模企业关停导致失业',
          '向中央展示积极整改姿态以规避问责',
        ],
        informalPractices: [
          '表面积极整改，实际为高纳税企业争取过渡期',
          '通过"一刀切"关停展示决心，但留有余地',
          '向上级汇报时突出整改成效，淡化遗留问题',
        ],
      },
      constraintSet: {
        centralConstraints: ['不能公开反对中央督察组的意见', '必须在公开场合表态支持督察工作'],
        fiscalConstraints: ['省级财政预算有硬性上限', '整改资金不能超过财政承受能力'],
        institutionalConstraints: ['需要维护社会稳定和就业', '整改方案需经省政府常务会议审议'],
        socialConstraints: ['大规模关停企业会引发群体性事件', '失业率上升影响社会稳定'],
      },
      preferences: {
        economic_growth: 0.75,
        fiscal_stability: 0.65,
        policy_compliance: 0.4,
        employment_stability: 0.6,
        political_promotion: 0.5,
      },
      constraints: [
        '不能公开反对中央督察组的意见',
        '省级财政预算有硬性上限',
        '需要维护社会稳定和就业',
      ],
      resources: {
        political_capital: 0.5,
        administrative_capacity: 0.7,
        information_access: 0.8,
        legal_authority: 0.4,
      },
      power: {
        agendaSetting: 0.4,
        veto: 0.2,
        resourceAllocation: 0.7,
        informationControl: 0.8,
        personnelMobility: 0.3,
        enforcement: 0.6,
        personnel: 0.5,
      },
      discourseStyle: {
        formalityLevel: 0.85,
        deferenceToSuperior: 0.9,
        ambiguityPreference: 0.7,
        consensusSeeking: 0.75,
        conflictAvoidance: 0.85,
        technicalVocabulary: 0.45,
        partyLanguageUsage: 0.7,
        localInterestEmphasis: 0.6,
        nationalAlignment: 0.8,
      },
    },
    {
      id: 'ministry_ecology',
      name: '生态环境部',
      role: '中央职能部门，环保技术标准与监管的制定者',
      level: 'central',
      position: {
        level: 'central',
        powerType: 'functional',
        jurisdiction: ['environmental_regulation', 'emission_standards', 'monitoring', 'technical_assessment'],
        vetoPower: false,
        rank: 4,
      },
      incentives: [
        { type: 'promotionPressure', intensity: 0.4, source: '部门晋升' },
        { type: 'fiscalIncentive', intensity: 0.3, source: '部门预算' },
        { type: 'politicalSignal', intensity: 0.7, source: '中央政策要求' },
        { type: 'accountabilityRisk', intensity: 0.3, source: '问责风险' },
        { type: 'professionalReputation', intensity: 0.9, source: '专业权威' },
      ],
      responsibilities: {
        coreMandate: '制定环保技术标准与排放规范，提供专业监管能力支撑',
        actionGoals: [
          '确保环保标准有科学依据',
          '扩大部门在环保治理中的话语权',
          '建立长效监管机制而非运动式治理',
        ],
        informalPractices: [
          '以技术论证方式影响政策走向',
          '通过数据监测能力掌握信息优势',
          '与督察组配合形成"政治+技术"双重压力',
        ],
      },
      constraintSet: {
        centralConstraints: ['需与中央督察组保持一致立场'],
        fiscalConstraints: ['部门预算有限，不能承诺大规模财政投入'],
        institutionalConstraints: ['没有直接的地方执法权', '技术标准需要科学依据支撑'],
        socialConstraints: ['标准过高可能引发企业反弹和社会不稳定'],
      },
      preferences: {
        regulatory_authority: 0.85,
        environmental_quality: 0.9,
        professional_reputation: 0.6,
        inter_departmental_coordination: 0.5,
      },
      constraints: [
        '没有直接的地方执法权',
        '需要与省级政府协调执行',
        '技术标准需要科学依据支撑',
      ],
      resources: {
        political_capital: 0.5,
        administrative_capacity: 0.6,
        information_access: 0.75,
        legal_authority: 0.7,
      },
      power: {
        agendaSetting: 0.6,
        veto: 0.4,
        resourceAllocation: 0.5,
        informationControl: 0.75,
        personnelMobility: 0.3,
        enforcement: 0.5,
        personnel: 0.5,
      },
      discourseStyle: {
        formalityLevel: 0.9,
        deferenceToSuperior: 0.6,
        ambiguityPreference: 0.3,
        consensusSeeking: 0.6,
        conflictAvoidance: 0.5,
        technicalVocabulary: 0.85,
        partyLanguageUsage: 0.5,
        localInterestEmphasis: 0.15,
        nationalAlignment: 0.85,
      },
    },
  ],

  protocol: {
    name: '环保督察政策协调5轮谈判',
    rounds: [
      {
        id: 0,
        name: '政策信号识别',
        description: '各方解读中央环保督察的政策信号，判断真实优先级和政治压力强度',
        speakingOrder: ['central_inspection', 'ministry_ecology'],
        arenaType: 'political_signal',
      },
      {
        id: 1,
        name: '利益声明',
        description: '各方声明核心目标、不可退让的底线、愿意妥协的空间',
        speakingOrder: ['provincial_government', 'ministry_ecology', 'central_inspection'],
        arenaType: 'bureaucratic_bargaining',
      },
      {
        id: 2,
        name: '方案竞争',
        description: '各方提出具体执行方案，包括目标调整、时间表、预算分配',
        speakingOrder: ['provincial_government', 'ministry_ecology', 'central_inspection'],
        arenaType: 'bureaucratic_bargaining',
      },
      {
        id: 3,
        name: '部门协调',
        description: '各方尝试对齐方案，形成联盟或妥协方案',
        speakingOrder: ['central_inspection', 'provincial_government', 'ministry_ecology'],
        arenaType: 'bureaucratic_bargaining',
      },
      {
        id: 4,
        name: '最终调整',
        description: '截止时间压力下，最后一轮让步与最终协议达成',
        speakingOrder: ['central_inspection', 'provincial_government', 'ministry_ecology'],
        arenaType: 'feedback',
      },
    ],
    deadlockThreshold: 2,
    deadlockResolution: 'escalation',
  },
};

// ============================================================
// 场景二：新医改政策制定过程（2006-2009）
// 横向部委协调博弈 — 碎片化威权主义 vs 共识型决策
// ============================================================

export const healthcareReformScenario: ScenarioConfig = {
  id: 'healthcare_reform',
  title: '新医改政策制定过程模拟（2006-2009）',
  domain: 'healthcare_policy',
  description:
    '模拟2006-2009年新一轮医药卫生体制改革中，国家发改委、卫生部、财政部三方在政策方案制定过程中的横向部委协调博弈。',

  agents: [
    {
      id: 'ndrc',
      name: '国家发展和改革委员会',
      role: '医改协调小组牵头方，负责改革总体方案设计与跨部门协调',
      level: 'central',
      position: {
        level: 'central',
        powerType: 'functional',
        jurisdiction: ['macro_planning', 'cross_departmental_coordination', 'reform_design', 'price_policy'],
        vetoPower: false,
        rank: 4,
      },
      incentives: [
        { type: 'politicalSignal', intensity: 0.85, source: '医改协调小组牵头' },
        { type: 'professionalReputation', intensity: 0.7, source: '改革成效关系部门权威' },
        { type: 'promotionPressure', intensity: 0.6, source: '政绩考核' },
      ],
      responsibilities: {
        coreMandate: '牵头组织医改方案总体设计，协调各部门利益分歧，推动改革进程',
        actionGoals: [
          '设计各方都能接受的改革总体框架',
          '协调卫生部和财政部的分歧',
          '确保方案能在规定时间内提交国务院',
        ],
        informalPractices: [
          '利用牵头地位设定议程和讨论框架',
          '在各方之间穿梭协调、寻找最大公约数',
          '以"国务院要求"施压推动进度',
        ],
      },
      constraintSet: {
        centralConstraints: ['改革方案需经国务院审批', '不能偏离中央医改大方向'],
        fiscalConstraints: ['不能承诺超出财政承受能力的投入规模'],
        institutionalConstraints: ['需要协调各部门利益分歧', '不能绕过卫生部的专业判断强行推进'],
        socialConstraints: ['改革方案需回应民众"看病难、看病贵"的诉求'],
      },
      preferences: {
        policy_goal_achievement: 0.85,
        institutional_authority: 0.8,
        inter_departmental_coordination: 0.75,
        political_stability: 0.6,
        reform_comprehensiveness: 0.8,
      },
      constraints: [
        '需要协调各部门利益分歧，推动方案达成共识',
        '改革方案需经国务院审批',
        '不能绕过卫生部的专业判断强行推进',
      ],
      resources: {
        political_capital: 0.85,
        administrative_capacity: 0.7,
        information_access: 0.75,
        legal_authority: 0.7,
      },
      power: {
        agendaSetting: 0.9,
        veto: 0.6,
        resourceAllocation: 0.7,
        informationControl: 0.65,
        personnelMobility: 0.5,
        enforcement: 0.6,
        personnel: 0.7,
      },
      discourseStyle: {
        formalityLevel: 0.9,
        deferenceToSuperior: 0.5,
        ambiguityPreference: 0.3,
        consensusSeeking: 0.8,
        conflictAvoidance: 0.5,
        technicalVocabulary: 0.5,
        partyLanguageUsage: 0.75,
        localInterestEmphasis: 0.15,
        nationalAlignment: 0.9,
      },
    },
    {
      id: 'moh',
      name: '卫生部',
      role: '医药卫生领域专业职能部门，改革方案的主要设计者和推动者',
      level: 'central',
      position: {
        level: 'central',
        powerType: 'functional',
        jurisdiction: ['healthcare_system', 'public_health', 'medical_institutions', 'health_workforce'],
        vetoPower: false,
        rank: 4,
      },
      incentives: [
        { type: 'professionalReputation', intensity: 0.9, source: '卫生领域专业权威' },
        { type: 'politicalSignal', intensity: 0.7, source: '国务院医改部署' },
        { type: 'fiscalIncentive', intensity: 0.6, source: '争取财政投入' },
      ],
      responsibilities: {
        coreMandate: '制定医药卫生体制改革的专业方案，推动公共卫生体系建设和医疗服务改革',
        actionGoals: [
          '推动建立覆盖城乡居民的基本医疗卫生制度',
          '争取财政对公共卫生的大幅增加投入',
          '强化卫生部在医改中的主导地位和专业话语权',
        ],
        informalPractices: [
          '以专业权威和技术信息优势影响方案设计',
          '联合专家学者形成舆论支持',
          '以"国际经验"和"群众呼声"论证扩大投入的必要性',
        ],
      },
      constraintSet: {
        centralConstraints: ['改革方案需服从国务院总体部署', '不能与发改委的协调框架产生正面冲突'],
        fiscalConstraints: ['不能脱离财政可行性空谈方案', '投入增长需分阶段推进'],
        institutionalConstraints: ['改革方案必须体现医疗卫生的专业性', '需与人社部协调医保体系'],
        socialConstraints: ['民众对"看病贵"问题高度敏感', '改革不能导致医疗服务质量下降'],
      },
      preferences: {
        public_health_coverage: 0.9,
        medical_system_reform: 0.85,
        institutional_influence: 0.7,
        professional_authority: 0.8,
        fiscal_expansion: 0.6,
      },
      constraints: [
        '改革方案必须体现医疗卫生的专业性',
        '需要争取财政投入支持',
        '不能脱离财政可行性空谈方案',
      ],
      resources: {
        political_capital: 0.6,
        administrative_capacity: 0.8,
        information_access: 0.85,
        legal_authority: 0.65,
      },
      power: {
        agendaSetting: 0.7,
        veto: 0.4,
        resourceAllocation: 0.3,
        informationControl: 0.85,
        personnelMobility: 0.3,
        enforcement: 0.5,
        personnel: 0.8,
      },
      discourseStyle: {
        formalityLevel: 0.85,
        deferenceToSuperior: 0.55,
        ambiguityPreference: 0.35,
        consensusSeeking: 0.6,
        conflictAvoidance: 0.5,
        technicalVocabulary: 0.85,
        partyLanguageUsage: 0.5,
        localInterestEmphasis: 0.2,
        nationalAlignment: 0.75,
      },
    },
    {
      id: 'mof',
      name: '财政部',
      role: '国家财政收支主管部门，医改资金保障与预算约束的把关方',
      level: 'central',
      position: {
        level: 'central',
        powerType: 'functional',
        jurisdiction: ['fiscal_policy', 'budget_allocation', 'social_security_fund', 'transfer_payments'],
        vetoPower: true,
        rank: 4,
      },
      incentives: [
        { type: 'fiscalIncentive', intensity: 0.9, source: '财政纪律和预算平衡' },
        { type: 'professionalReputation', intensity: 0.8, source: '财政专业权威' },
        { type: 'politicalSignal', intensity: 0.75, source: '中央政治任务' },
      ],
      responsibilities: {
        coreMandate: '审核医改方案的财政可行性，确定政府卫生投入规模与增长机制',
        actionGoals: [
          '控制医改财政投入总规模在可承受范围内',
          '设计可持续的政府卫生投入增长机制',
          '推动资金使用效率提升而非单纯增加投入',
        ],
        informalPractices: [
          '以"财政承受能力"为由压缩各方投入诉求',
          '要求分项列明资金用途和绩效目标',
          '以"分步实施""试点先行"策略延缓大规模支出',
        ],
      },
      constraintSet: {
        centralConstraints: ['中央已明确医改是重大民生工程，不能完全否决投入', '需配合国务院整体时间表'],
        fiscalConstraints: ['财政收入增速有限，不能无限制扩大支出', '需兼顾其他民生领域投入'],
        institutionalConstraints: ['预算安排需经全国人大审议', '转移支付制度有既定框架'],
        socialConstraints: ['不能因资金问题导致医改方案流产引发社会不满'],
      },
      preferences: {
        fiscal_discipline: 0.9,
        budget_control: 0.85,
        economic_stability: 0.8,
        inter_departmental_harmony: 0.5,
        policy_compliance: 0.6,
      },
      constraints: [
        '必须守住财政可持续性的底线',
        '任何新增支出需明确资金来源',
        '不能单独否决国务院已原则同意的方案',
      ],
      resources: {
        political_capital: 0.7,
        administrative_capacity: 0.75,
        information_access: 0.8,
        legal_authority: 0.75,
      },
      power: {
        agendaSetting: 0.5,
        veto: 0.8,
        resourceAllocation: 0.9,
        informationControl: 0.7,
        personnelMobility: 0.3,
        enforcement: 0.6,
        personnel: 0.85,
      },
      discourseStyle: {
        formalityLevel: 0.9,
        deferenceToSuperior: 0.6,
        ambiguityPreference: 0.25,
        consensusSeeking: 0.55,
        conflictAvoidance: 0.6,
        technicalVocabulary: 0.8,
        partyLanguageUsage: 0.6,
        localInterestEmphasis: 0.1,
        nationalAlignment: 0.85,
      },
    },
  ],

  protocol: {
    name: '新医改政策协调5轮谈判',
    rounds: [
      {
        id: 0,
        name: '政策信号识别',
        description: '各方解读国务院关于启动新医改的政策信号，判断改革的真实优先级、政治决心和资源投入意愿',
        speakingOrder: ['ndrc', 'moh'],
        arenaType: 'political_signal',
      },
      {
        id: 1,
        name: '利益声明',
        description: '各方声明核心目标、不可退让的底线、愿意妥协的空间',
        speakingOrder: ['mof', 'moh', 'ndrc'],
        arenaType: 'bureaucratic_bargaining',
      },
      {
        id: 2,
        name: '方案竞争',
        description: '各方提出具体方案，包括改革路径、投入规模、制度设计、实施时间表',
        speakingOrder: ['moh', 'mof', 'ndrc'],
        arenaType: 'bureaucratic_bargaining',
      },
      {
        id: 3,
        name: '部门协调',
        description: '各方尝试对齐方案，在投入规模、制度框架、实施节奏上寻求妥协',
        speakingOrder: ['ndrc', 'mof', 'moh'],
        arenaType: 'bureaucratic_bargaining',
      },
      {
        id: 4,
        name: '最终调整',
        description: '在国务院审议 deadline 压力下，最后一轮让步与最终方案定型',
        speakingOrder: ['ndrc', 'mof', 'moh'],
        arenaType: 'feedback',
      },
    ],
    deadlockThreshold: 2,
    deadlockResolution: 'escalation',
  },

  environment: {
    political: {
      centralAuthority: 0.85,
      policySignalClarity: 0.75,
      supervisionIntensity: 0.8,
      politicalStability: 0.9,
    },
    economic: {
      fiscalPressure: 0.6,
      economicGrowth: 0.7,
      resourceAbundance: 0.5,
      marketMaturity: 0.65,
    },
    social: {
      publicAttention: 0.7,
      opinionPressure: 0.65,
      interestGroupActivity: 0.6,
      socialStability: 0.85,
    },
    institutional: {
      regulationCompleteness: 0.6,
      accountabilityStrength: 0.75,
      informationTransparency: 0.55,
      coordinationMaturity: 0.7,
    },
  },

  relationships: {
    relationships: [
      {
        from: 'ndrc',
        to: 'moh',
        type: 'collaborative',
        strength: 0.7,
        trust: 0.65,
        infoFlow: 'bidirectional',
        history: 'cooperative',
        powerAsymmetry: 0.3,
      },
      {
        from: 'ndrc',
        to: 'mof',
        type: 'collaborative',
        strength: 0.75,
        trust: 0.7,
        infoFlow: 'bidirectional',
        powerAsymmetry: 0.25,
        history: 'neutral',
      },
      {
        from: 'moh',
        to: 'mof',
        type: 'competitive',
        strength: 0.6,
        trust: 0.5,
        infoFlow: 'bidirectional',
        powerAsymmetry: 0.4,
        history: 'conflict',
      },
    ],
  },
};

// ============================================================
// 场景注册表
// ============================================================

export const scenarioRegistry: Record<string, ScenarioConfig> = {
  environmental_inspection: environmentalInspectionScenario,
  healthcare_reform: healthcareReformScenario,
};
