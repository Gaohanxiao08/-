'use client';

import { useState, useEffect, useRef } from 'react';
import type {
  AgentConfig,
  SimulationEvent,
  GameRule,
  IncentiveItem,
  InstitutionalPosition,
  EnvironmentConfig,
  RelationshipNetwork,
  RelationshipType,
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeDocType,
  IfThenRule,
  RuleEngine,
  RuleCondition,
  RuleEffect,
  RuleOperator,
  RuleEffectType,
  RuleEvaluationLog,
  DecisionTrace,
  AgentApiConfig,
} from '@/lib/simulation/types';

// ===== 配色 =====
const C = {
  bg: '#faf8f5',
  card: '#ffffff',
  cardHover: '#fefcf9',
  border: '#e8e0d4',
  borderLight: '#f0ebe3',
  primary: '#c41e3a',
  primaryLight: '#f5e6e9',
  primaryDark: '#9e1830',
  accent: '#d4a843',
  accentLight: '#faf3e0',
  text: '#2c2420',
  textSecondary: '#6b5e52',
  textMuted: '#9b8e82',
  success: '#2d8a4e',
  successLight: '#e8f5ec',
  warning: '#c47820',
  warningLight: '#fef5e7',
  danger: '#c41e3a',
  dangerLight: '#fef2f3',
};

const AGENT_COLORS = ['#c41e3a', '#d4a843', '#2d8a4e', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'];

// ===== 可用AI模型列表 =====
const AVAILABLE_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek-V3 (通用对话)', provider: 'deepseek' },
  { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (推理增强)', provider: 'deepseek' },
  { id: 'deepseek-coder', name: 'DeepSeek-Coder (代码)', provider: 'deepseek' },
];

// ===== 默认API配置 =====
const createDefaultApiConfig = (apiKey?: string): AgentApiConfig => ({
  provider: 'deepseek',
  apiKey: apiKey || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '',
  baseUrl: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 0.9,
  enableThinkingTrace: true,
  thinkingTrace: [],
});

// ===== API配置自动保存 =====
const API_CONFIG_STORAGE_KEY = 'coze_sim_api_configs';

const saveApiConfigsToStorage = (agents: AgentConfig[]) => {
  try {
    const configs = agents.map(a => ({ id: a.id, apiConfig: a.apiConfig }));
    localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(configs));
  } catch (e) {
    console.warn('Failed to save API configs to localStorage:', e);
  }
};

const loadApiConfigsFromStorage = (): Map<string, AgentApiConfig> => {
  try {
    const stored = localStorage.getItem(API_CONFIG_STORAGE_KEY);
    if (!stored) return new Map();
    const configs: Array<{ id: string; apiConfig: AgentApiConfig }> = JSON.parse(stored);
    return new Map(configs.map(c => [c.id, c.apiConfig]));
  } catch (e) {
    console.warn('Failed to load API configs from localStorage:', e);
    return new Map();
  }
};

// ===== 默认Agent =====
const createDefaultAgents = (): AgentConfig[] => {
  const savedConfigs = loadApiConfigsFromStorage();
  const agents: AgentConfig[] = [
    {
      id: 'ndrc',
      name: '国家发展和改革委员会',
      role: '医改协调小组牵头单位，负责改革的总体方案设计和统筹协调',
      level: 'central',
      rank: 1,
      position: { level: 'central', powerType: 'functional', jurisdiction: ['宏观政策', '改革协调', '规划审批'], vetoPower: true, rank: 1 },
      resources: { politicalCapital: 0.8, administrativeCapacity: 0.7, informationAdvantage: 0.6, legalAuthority: 0.7 },
      preferences: { policyGoalAchievement: 0.9, politicalStability: 0.6, institutionalAuthority: 0.7, fiscalStability: 0.5, reformProgress: 0.8 },
      constraints: ['必须贯彻中央改革决策', '需要协调各部门立场', '改革方案需具有可操作性'],
      hardConstraints: ['不能违背国务院改革方向', '必须在期限内完成方案设计'],
      softConstraints: ['需考虑财政部预算约束', '需兼顾地方执行能力'],
      incentives: [
        { type: 'political', intensity: 0.9, source: '中央改革领导小组的期望' },
        { type: 'professional', intensity: 0.7, source: '改革成效的专业声誉' },
        { type: 'promotion', intensity: 0.6, source: '改革政绩对晋升的影响' },
      ],
      actionGoals: ['设计全民医保框架', '建立基本药物制度', '推进公立医院改革试点'],
      responsibilities: { coreMandate: '统筹协调医改全局', actionGoals: ['方案设计', '部门协调', '进度推进'], informalPractices: ['与卫生部密切沟通', '征求地方意见'], description: '牵头推进新医改方案设计' },
      constraintSet: { hard: ['贯彻中央决策', '协调各部门'], soft: ['考虑财政约束', '兼顾地方能力'] },
      power: { agendaSetting: 0.8, veto: 0.7, resourceAllocation: 0.6, informationControl: 0.5, personnel: 0.4, enforcement: 0.5 },
      discourseStyle: { agentId: 'ndrc', formalityLevel: 0.9, deferenceToSuperior: 0.8, ambiguityPreference: 0.3, consensusSeeking: 0.7, conflictAvoidance: 0.4, technicalVocabulary: 0.6, partyLanguageUsage: 0.8, localInterestEmphasis: 0.3, nationalAlignment: 0.9 },
      apiConfig: { ...createDefaultApiConfig(), model: 'deepseek-reasoner' },
    },
    {
      id: 'moh',
      name: '卫生部',
      role: '医疗卫生主管部门，负责专业方案设计和行业管理',
      level: 'central',
      rank: 2,
      position: { level: 'central', powerType: 'functional', jurisdiction: ['医疗卫生', '疾病控制', '行业监管'], vetoPower: false, rank: 2 },
      resources: { politicalCapital: 0.5, administrativeCapacity: 0.8, informationAdvantage: 0.9, legalAuthority: 0.6 },
      preferences: { policyGoalAchievement: 0.7, politicalStability: 0.5, institutionalAuthority: 0.8, fiscalStability: 0.4, professionalReputation: 0.9 },
      constraints: ['必须维护医疗卫生行业利益', '需要保障医疗服务质量', '改革不能损害现有体系'],
      hardConstraints: ['不能削弱卫生部的行业管理权', '必须保障医务人员利益'],
      softConstraints: ['可适当让渡部分审批权', '可接受外部监督'],
      incentives: [
        { type: 'professional', intensity: 0.9, source: '医疗卫生专业声誉' },
        { type: 'political', intensity: 0.5, source: '部门在改革中的地位' },
        { type: 'accountability', intensity: 0.6, source: '医疗事故问责压力' },
      ],
      actionGoals: ['维护行业管理主导权', '确保方案专业可行性', '扩大公共卫生投入'],
      responsibilities: { coreMandate: '医疗卫生行业管理', actionGoals: ['专业方案设计', '行业标准制定', '服务质量监管'], informalPractices: ['与地方政府协调', '听取专家意见'], description: '负责医改专业方案设计和行业管理' },
      constraintSet: { hard: ['维护行业管理权', '保障医务人员利益'], soft: ['可让渡审批权', '可接受监督'] },
      power: { agendaSetting: 0.6, veto: 0.4, resourceAllocation: 0.5, informationControl: 0.8, personnel: 0.5, enforcement: 0.6 },
      discourseStyle: { agentId: 'moh', formalityLevel: 0.8, deferenceToSuperior: 0.6, ambiguityPreference: 0.5, consensusSeeking: 0.5, conflictAvoidance: 0.6, technicalVocabulary: 0.9, partyLanguageUsage: 0.6, localInterestEmphasis: 0.4, nationalAlignment: 0.7 },
      apiConfig: { ...createDefaultApiConfig(), model: 'deepseek-chat' },
    },
    {
      id: 'mof',
      name: '财政部',
      role: '财政资金管理机关，负责改革资金保障和预算约束',
      level: 'central',
      rank: 3,
      position: { level: 'central', powerType: 'functional', jurisdiction: ['财政预算', '资金管理', '转移支付'], vetoPower: true, rank: 3 },
      resources: { politicalCapital: 0.7, administrativeCapacity: 0.6, informationAdvantage: 0.7, legalAuthority: 0.8 },
      preferences: { policyGoalAchievement: 0.5, politicalStability: 0.7, institutionalAuthority: 0.6, fiscalStability: 0.9, budgetControl: 0.9 },
      constraints: ['必须控制财政支出规模', '需要保障基本公共服务', '改革成本需可承受'],
      hardConstraints: ['不能突破财政预算硬约束', '必须确保财政可持续性'],
      softConstraints: ['可适度增加卫生投入', '可设计分阶段投入机制'],
      incentives: [
        { type: 'fiscal', intensity: 0.9, source: '财政纪律和预算约束' },
        { type: 'political', intensity: 0.6, source: '财政稳健的政治评价' },
        { type: 'professional', intensity: 0.5, source: '财政管理专业声誉' },
      ],
      actionGoals: ['控制改革财政成本', '设计可持续筹资机制', '确保财政资金效率'],
      responsibilities: { coreMandate: '财政资金管理和预算约束', actionGoals: ['资金保障', '成本控制', '效率评估'], informalPractices: ['与地方财政协调', '争取中央转移支付'], description: '负责医改资金保障和预算约束' },
      constraintSet: { hard: ['财政预算硬约束', '财政可持续性'], soft: ['可适度增加投入', '可分阶段投入'] },
      power: { agendaSetting: 0.5, veto: 0.9, resourceAllocation: 0.9, informationControl: 0.6, personnel: 0.3, enforcement: 0.7 },
      discourseStyle: { agentId: 'mof', formalityLevel: 0.85, deferenceToSuperior: 0.7, ambiguityPreference: 0.4, consensusSeeking: 0.6, conflictAvoidance: 0.5, technicalVocabulary: 0.7, partyLanguageUsage: 0.5, localInterestEmphasis: 0.5, nationalAlignment: 0.8 },
      apiConfig: { ...createDefaultApiConfig(), model: 'deepseek-chat' },
    },
  ];
  // 应用保存的API配置
  return agents.map(agent => {
    const savedConfig = savedConfigs.get(agent.id);
    if (savedConfig) {
      return { ...agent, apiConfig: savedConfig };
    }
    return agent;
  });
};

// ===== 默认规则 =====
const DEFAULT_RULES: GameRule[] = [
  { id: 'r1', name: '中央优先', description: '中央部门的政策目标优先于部门利益', priority: 1, type: 'hard' },
  { id: 'r2', name: '财政约束', description: '任何方案必须通过财政可行性审查', priority: 2, type: 'hard' },
  { id: 'r3', name: '协商一致', description: '重大分歧需通过协商解决，不能强行通过', priority: 3, type: 'soft' },
];

// ===== 默认 If-Then 规则引擎规则 =====
function getDefaultRules(): IfThenRule[] {
  return [
    {
      id: 'rule_001',
      name: '中央权威强化效应',
      description: '当中央权威强度高时，中央部门的政策目标权重提升，地方部门服从性增强',
      priority: 10,
      enabled: true,
      category: 'environment',
      color: '#c41e3a',
      conditions: [
        { id: 'c1', metricSource: 'environment', metricPath: 'political.centralAuthority', operator: 'gte', value: 0.7, description: '中央权威强度 ≥ 0.7' },
      ],
      effects: [
        { id: 'e1', type: 'modify_preference_weight', target: 'agents.*.preferences.policyGoalAchievement', value: 1.2, description: '所有Agent政策目标权重 ×1.2' },
        { id: 'e2', type: 'modify_preference_weight', target: 'agents.*.preferences.institutionalAuthority', value: 0.8, description: '所有Agent部门权威权重 ×0.8' },
      ],
    },
    {
      id: 'rule_002',
      name: '财政压力下的妥协机制',
      description: '当财政压力大时，财政部更坚持预算约束，其他部门降低财政扩张意愿',
      priority: 8,
      enabled: true,
      category: 'environment',
      color: '#d4a843',
      conditions: [
        { id: 'c1', metricSource: 'environment', metricPath: 'economic.fiscalPressure', operator: 'gte', value: 0.6, description: '财政压力 ≥ 0.6' },
      ],
      effects: [
        { id: 'e1', type: 'modify_preference_weight', target: 'agents.mof.preferences.fiscalStability', value: 1.3, description: '财政部财政稳定权重 ×1.3' },
        { id: 'e2', type: 'modify_preference_weight', target: 'agents.*.preferences.fiscalExpansion', value: 0.7, description: '所有Agent财政扩张意愿 ×0.7' },
      ],
    },
    {
      id: 'rule_003',
      name: '协作关系促进共识',
      description: '当两Agent关系为协作型且信任度高时，双方更容易达成共识',
      priority: 6,
      enabled: true,
      category: 'relationship',
      color: '#2d8a4e',
      conditions: [
        { id: 'c1', metricSource: 'relationship', metricPath: 'type', operator: 'eq', value: 'collaborative', description: '关系类型为协作' },
        { id: 'c2', metricSource: 'relationship', metricPath: 'trust', operator: 'gte', value: 0.6, description: '信任度 ≥ 0.6' },
      ],
      effects: [
        { id: 'e1', type: 'modify_consensus', target: 'consensus', value: 0.1, description: '共识度 +10%' },
        { id: 'e2', type: 'modify_preference_weight', target: 'agents.*.preferences.interDepartmentalHarmony', value: 1.2, description: '部门间和谐权重 ×1.2' },
      ],
    },
    {
      id: 'rule_004',
      name: '竞争关系加剧冲突',
      description: '当两Agent关系为竞争型时，分歧加大，共识度降低',
      priority: 7,
      enabled: true,
      category: 'relationship',
      color: '#ef4444',
      conditions: [
        { id: 'c1', metricSource: 'relationship', metricPath: 'type', operator: 'eq', value: 'competitive', description: '关系类型为竞争' },
      ],
      effects: [
        { id: 'e1', type: 'modify_consensus', target: 'consensus', value: -0.15, description: '共识度 -15%' },
        { id: 'e2', type: 'trigger_discourse', target: 'agents.*', value: 'conflict_avoidance', description: '触发冲突回避话术' },
      ],
    },
    {
      id: 'rule_005',
      name: '否决权行使条件',
      description: '当方案与Agent核心利益严重冲突且该Agent拥有否决权时，可能行使否决',
      priority: 9,
      enabled: true,
      category: 'power',
      color: '#6366f1',
      conditions: [
        { id: 'c1', metricSource: 'agent', metricPath: 'position.vetoPower', operator: 'eq', value: true, description: '拥有否决权' },
        { id: 'c2', metricSource: 'game_state', metricPath: 'proposalConflictLevel', operator: 'gte', value: 0.7, description: '方案冲突度 ≥ 0.7' },
      ],
      effects: [
        { id: 'e1', type: 'disable_action', target: 'proposal.pass', value: true, description: '阻止方案通过' },
        { id: 'e2', type: 'trigger_discourse', target: 'agents.*', value: 'veto_threat', description: '触发否决威胁话术' },
      ],
    },
    {
      id: 'rule_006',
      name: '舆论压力响应',
      description: '当公众关注度和舆论压力双高时，所有Agent增加对公共卫生覆盖的偏好',
      priority: 5,
      enabled: true,
      category: 'environment',
      color: '#ec4899',
      conditions: [
        { id: 'c1', metricSource: 'environment', metricPath: 'social.publicAttention', operator: 'gte', value: 0.7, description: '公众关注度 ≥ 0.7' },
        { id: 'c2', metricSource: 'environment', metricPath: 'social.opinionPressure', operator: 'gte', value: 0.6, description: '舆论压力 ≥ 0.6' },
      ],
      effects: [
        { id: 'e1', type: 'modify_preference_weight', target: 'agents.*.preferences.publicHealthCoverage', value: 1.3, description: '公共卫生覆盖权重 ×1.3' },
        { id: 'e2', type: 'modify_preference_weight', target: 'agents.*.preferences.politicalStability', value: 1.2, description: '政治稳定权重 ×1.2' },
      ],
    },
  ];
}

export default function Page() {
  // ===== 状态 =====
  const [scenarios, setScenarios] = useState<{ id: string; title: string; description: string }[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('healthcare_reform');
  const [agents, setAgents] = useState<AgentConfig[]>(createDefaultAgents());
  const [rules, setRules] = useState<GameRule[]>(DEFAULT_RULES);
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [currentRound, setCurrentRound] = useState(-1);
  const [consensus, setConsensus] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showEnvironment, setShowEnvironment] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);
  const [editingField, setEditingField] = useState<{ agentId: string; field: string } | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentConfig>({
    political: { centralAuthority: 0.8, policySignalClarity: 0.7, supervisionIntensity: 0.6, politicalStability: 0.9 },
    economic: { fiscalPressure: 0.5, economicGrowth: 0.6, resourceAbundance: 0.4, marketMaturity: 0.5 },
    social: { publicAttention: 0.7, opinionPressure: 0.6, interestGroupActivity: 0.5, socialStability: 0.8 },
    institutional: { regulationCompleteness: 0.6, accountabilityStrength: 0.7, informationTransparency: 0.5, coordinationMaturity: 0.6 },
  });
  const [relationships, setRelationships] = useState<RelationshipNetwork>({
    relationships: [
      { from: 'ndrc', to: 'nhc', type: 'collaborative', strength: 0.8, trust: 0.7, infoFlow: 'bidirectional', powerAsymmetry: 0.3, history: 'cooperative' },
      { from: 'ndrc', to: 'mof', type: 'collaborative', strength: 0.7, trust: 0.6, infoFlow: 'bidirectional', powerAsymmetry: 0.2, history: 'neutral' },
      { from: 'nhc', to: 'mof', type: 'competitive', strength: 0.6, trust: 0.5, infoFlow: 'bidirectional', powerAsymmetry: 0.4, history: 'conflict' },
    ],
  });

  // 知识库状态
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({ documents: [] });
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [newDoc, setNewDoc] = useState<{ title: string; type: KnowledgeDocType; content: string; tags: string }>({ title: '', type: 'policy', content: '', tags: '' });

  // 规则引擎状态
  const [ruleEngine, setRuleEngine] = useState<RuleEngine>({
    rules: getDefaultRules(),
    lastEvaluated: null,
    evaluationLog: [],
  });
  const [showRuleEngine, setShowRuleEngine] = useState(false);
  const [editingRule, setEditingRule] = useState<IfThenRule | null>(null);
  const [showDecisionTrace, setShowDecisionTrace] = useState(false);
  const [decisionTraces, setDecisionTraces] = useState<DecisionTrace[]>([]);

  // 编辑状态
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editLevel, setEditLevel] = useState('central');
  const [editPowerType, setEditPowerType] = useState('functional');
  const [editJurisdiction, setEditJurisdiction] = useState('');
  const [editVetoPower, setEditVetoPower] = useState(false);

  // 新Agent表单
  const [newAgent, setNewAgent] = useState<{ id: string; name: string; role: string; level: 'central' | 'provincial' | 'municipal' | 'local' }>({ id: '', name: '', role: '', level: 'central' });

  const eventsEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ===== 初始化 =====
  useEffect(() => {
    fetch('/api/simulate').then(r => r.json()).then(d => {
      setScenarios(d.scenarios.map((s: { id: string; title: string; description: string }) => ({ id: s.id, title: s.title, description: s.description })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // ===== 模拟控制 =====
  const startSimulation = async () => {
    setIsRunning(true);
    setEvents([]);
    setCurrentRound(-1);
    setConsensus(0);
    setError(null);

    // 检查API密钥
    const agentsWithoutKey = agents.filter(a => !a.apiConfig?.apiKey);
    if (agentsWithoutKey.length > 0) {
      setError(`以下Agent未设置API密钥：${agentsWithoutKey.map(a => a.name).join('、')}。请在Agent编辑中设置API密钥。`);
      return;
    }

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: selectedScenario, customAgents: agents, rules }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as SimulationEvent;
              setEvents(prev => [...prev, event]);
              if (event.type === 'round_start') setCurrentRound(event.round);
              if (event.type === 'consensus_update') setConsensus((event.data as { consensusScore: number }).consensusScore);
              // 收集决策追溯数据
              if (event.type === 'decision_trace') {
                setDecisionTraces(prev => [...prev, event.data as unknown as DecisionTrace]);
              }
              // 记录错误事件到控制台，帮助调试
              if (event.type === 'error') {
                console.error('[模拟错误]', event.data);
              }
            } catch (e) {
              console.error('[SSE解析错误]', line, e);
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const stopSimulation = () => { abortRef.current?.abort(); setIsRunning(false); };
  const resetSimulation = () => { setEvents([]); setCurrentRound(-1); setConsensus(0); setError(null); };

  // ===== Agent编辑 =====
  const openAgentEdit = (agent: AgentConfig) => {
    setSelectedAgentId(agent.id);
    setEditName(agent.name);
    setEditRole(agent.role);
    setEditLevel(agent.level);
    setEditPowerType(agent.position.powerType);
    setEditJurisdiction(agent.position.jurisdiction.join('、'));
    setEditVetoPower(agent.position.vetoPower);
  };

  const saveAgentEdit = () => {
    if (!selectedAgentId) return;
    setAgents(prev => {
      const updated = prev.map(a => {
        if (a.id !== selectedAgentId) return a;
        return {
          ...a,
          name: editName,
          role: editRole,
          level: editLevel as AgentConfig['level'],
          position: { ...a.position, level: editLevel as InstitutionalPosition['level'], powerType: editPowerType, jurisdiction: editJurisdiction.split(/[、,，]/).filter(Boolean), vetoPower: editVetoPower },
        } as AgentConfig;
      });
      // 自动保存API密钥到localStorage
      saveApiConfigsToStorage(updated);
      return updated;
    });
    setSelectedAgentId(null);
  };

  const updatePreference = (agentId: string, key: string, value: number) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, preferences: { ...a.preferences, [key]: value } } : a));
  };

  const updateResource = (agentId: string, key: string, value: number) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, resources: { ...a.resources, [key]: value } } : a));
  };

  const updatePower = (agentId: string, key: string, value: number) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, power: { ...a.power, [key]: value } } : a));
  };

  const updateIncentive = (agentId: string, index: number, field: keyof IncentiveItem, value: string | number) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      const newIncentives = [...a.incentives];
      newIncentives[index] = { ...newIncentives[index], [field]: value };
      return { ...a, incentives: newIncentives };
    }));
  };

  const addIncentive = (agentId: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, incentives: [...a.incentives, { type: 'political', intensity: 0.5, source: '新激励因素' }] } : a));
  };

  const removeIncentive = (agentId: string, index: number) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, incentives: a.incentives.filter((_, i) => i !== index) } : a));
  };

  const addHardConstraint = (agentId: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, hardConstraints: [...(a.hardConstraints || []), '新硬约束'] } : a));
  };

  const updateHardConstraint = (agentId: string, index: number, value: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      const hc = [...(a.hardConstraints || [])];
      hc[index] = value;
      return { ...a, hardConstraints: hc };
    }));
  };

  const removeHardConstraint = (agentId: string, index: number) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, hardConstraints: (a.hardConstraints || []).filter((_, i) => i !== index) } : a));
  };

  const addSoftConstraint = (agentId: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, softConstraints: [...(a.softConstraints || []), '新软约束'] } : a));
  };

  const updateSoftConstraint = (agentId: string, index: number, value: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      const sc = [...(a.softConstraints || [])];
      sc[index] = value;
      return { ...a, softConstraints: sc };
    }));
  };

  const removeSoftConstraint = (agentId: string, index: number) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, softConstraints: (a.softConstraints || []).filter((_, i) => i !== index) } : a));
  };

  const addActionGoal = (agentId: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, actionGoals: [...(a.actionGoals || []), '新行动目标'] } : a));
  };

  const updateActionGoal = (agentId: string, index: number, value: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id !== agentId) return a;
      const ag = [...(a.actionGoals || [])];
      ag[index] = value;
      return { ...a, actionGoals: ag };
    }));
  };

  const removeActionGoal = (agentId: string, index: number) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, actionGoals: (a.actionGoals || []).filter((_, i) => i !== index) } : a));
  };

  // ===== 角色管理 =====
  const addAgent = () => {
    if (!newAgent.id || !newAgent.name) return;
    const colorIdx = agents.length % AGENT_COLORS.length;
    const agent: AgentConfig = {
      id: newAgent.id,
      name: newAgent.name,
      role: newAgent.role || '新角色',
      level: newAgent.level,
      rank: agents.length + 1,
      position: { level: newAgent.level, powerType: 'functional', jurisdiction: [], vetoPower: false, rank: agents.length + 1 },
      resources: { politicalCapital: 0.5, administrativeCapacity: 0.5, informationAdvantage: 0.5, legalAuthority: 0.5 },
      preferences: { policyGoalAchievement: 0.5, politicalStability: 0.5, institutionalAuthority: 0.5, fiscalStability: 0.5 },
      constraints: ['无特殊约束'],
      hardConstraints: ['遵守中央决策'],
      softConstraints: ['考虑部门利益'],
      incentives: [{ type: 'political', intensity: 0.5, source: '政治激励' }],
      actionGoals: ['完成分配任务'],
      responsibilities: { coreMandate: '待定', actionGoals: ['待定'], informalPractices: [], description: '新角色' },
      constraintSet: { hard: ['遵守中央决策'], soft: ['考虑部门利益'] },
      power: { agendaSetting: 0.5, veto: 0.3, resourceAllocation: 0.5, informationControl: 0.5, personnel: 0.3, enforcement: 0.5 },
      discourseStyle: { agentId: newAgent.id, formalityLevel: 0.7, deferenceToSuperior: 0.6, ambiguityPreference: 0.5, consensusSeeking: 0.5, conflictAvoidance: 0.5, technicalVocabulary: 0.5, partyLanguageUsage: 0.5, localInterestEmphasis: 0.5, nationalAlignment: 0.7 },
    };
    setAgents(prev => [...prev, agent]);
    setNewAgent({ id: '', name: '', role: '', level: 'central' });
    setShowAddAgent(false);
  };

  const deleteAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
    if (selectedAgentId === id) setSelectedAgentId(null);
  };

  // ===== 规则管理 =====
  const addRule = () => {
    setRules(prev => [...prev, { id: `r${Date.now()}`, name: '新规则', description: '规则描述', priority: prev.length + 1, type: 'soft' } as GameRule]);
  };

  const updateRule = (id: string, field: keyof GameRule, value: string | number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  // ===== 渲染 =====
  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const roundNames = ['政策信号识别', '利益声明', '方案竞争', '部门协调', '最终调整'];
  const roundDescs = [
    '各方解读政策信号，判断改革优先级',
    '各方声明核心目标、底线和妥协空间',
    '各方提出具体方案，展开竞争',
    '各方协调立场，形成联盟或妥协',
    '最后让步，达成最终协议',
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
      {/* Header */}
      <header style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>政</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>中国政策过程多智能体模拟平台</h1>
            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>理论驱动的计算社会科学模拟框架</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowEnvironment(true)} style={{ padding: '8px 16px', background: '#f0f7ff', color: '#1a73e8', border: '1px solid #1a73e8', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>环境设定</button>
          <button onClick={() => setShowRelationships(true)} style={{ padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #16a34a', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>关系网络</button>
          <button onClick={() => setShowRuleEngine(true)} style={{ padding: '8px 16px', background: '#fef3c7', color: '#d97706', border: '1px solid #d97706', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>规则引擎</button>
          <button onClick={() => setShowKnowledgeBase(true)} style={{ padding: '8px 16px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>知识库</button>
          <button onClick={() => setShowDecisionTrace(true)} style={{ padding: '8px 16px', background: '#fdf2f8', color: '#db2777', border: '1px solid #db2777', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>决策追溯</button>
          <button onClick={() => setShowAddAgent(true)} style={{ padding: '8px 16px', background: C.primaryLight, color: C.primary, border: `1px solid ${C.primary}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ 添加角色</button>
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 69px)' }}>
        {/* 左侧Agent列表 */}
        <aside style={{ width: 280, background: C.card, borderRight: `1px solid ${C.border}`, padding: 16, overflowY: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 12 }}>参与博弈的智能体 ({agents.length})</div>
          {agents.map((agent, idx) => {
            const hasApiKey = !!agent.apiConfig?.apiKey;
            return (
            <div key={agent.id} onClick={() => openAgentEdit(agent)} style={{ padding: 12, marginBottom: 8, background: selectedAgentId === agent.id ? C.primaryLight : C.bg, border: `1px solid ${selectedAgentId === agent.id ? C.primary : C.border}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: AGENT_COLORS[idx % AGENT_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{agent.name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{agent.level === 'central' ? '中央' : agent.level === 'provincial' ? '省级' : '地方'}</div>
                </div>
                {hasApiKey ? (
                  <div style={{ fontSize: 10, color: '#10b981', padding: '2px 6px', background: '#ecfdf5', borderRadius: 4 }}>✓ API已设置</div>
                ) : (
                  <div style={{ fontSize: 10, color: '#ef4444', padding: '2px 6px', background: '#fef2f2', borderRadius: 4 }}>⚠ 未设置API</div>
                )}
                <button onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id); }} style={{ width: 20, height: 20, borderRadius: 4, background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 14 }} title="删除">×</button>
              </div>
            </div>
            );
          })}
        </aside>

        {/* 中间主区域 */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {/* 控制栏 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <select value={selectedScenario} onChange={e => setSelectedScenario(e.target.value)} disabled={isRunning} style={{ padding: '10px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, cursor: 'pointer' }}>
              {scenarios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            {!isRunning ? (
              <button onClick={startSimulation} style={{ flex: 1, padding: '10px 20px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>开始博弈</button>
            ) : (
              <button onClick={stopSimulation} style={{ flex: 1, padding: '10px 20px', background: C.warning, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>停止</button>
            )}
            <button onClick={resetSimulation} disabled={isRunning} style={{ padding: '10px 16px', background: C.card, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>重置</button>
          </div>

          {/* 共识度 */}
          {currentRound >= 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>共识度</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: consensus >= 70 ? C.success : consensus >= 40 ? C.warning : C.danger }}>{consensus}%</span>
              </div>
              <div style={{ height: 8, background: C.borderLight, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${consensus}%`, height: '100%', background: consensus >= 70 ? C.success : consensus >= 40 ? C.accent : C.primary, borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          )}

          {/* 事件流 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map((event, idx) => {
              const d = event.data as Record<string, string | number | boolean>;
              if (event.type === 'round_start') {
                return (
                  <div key={idx} style={{ background: `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})`, border: `1px solid ${C.primary}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11, color: C.primary, fontWeight: 600, marginBottom: 4 }}>第 {event.round + 1} 轮 · {roundNames[event.round] || d.roundName}</div>
                    <div style={{ fontSize: 13, color: C.textSecondary }}>{roundDescs[event.round] || d.description}</div>
                  </div>
                );
              }
              if (event.type === 'agent_thinking') {
                const agentIdx = agents.findIndex(a => a.id === d.agentId);
                const color = AGENT_COLORS[agentIdx >= 0 ? agentIdx % AGENT_COLORS.length : 0];
                const agentName = String(d.agentName || '');
                // 直接从事件数据获取思考步骤
                const roundThinking = (d.thinkingSteps as unknown as Array<{ phase: string; content: string; timestamp: number; factors?: string[]; confidence?: number }>) || [];
                return (
                  <div key={idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', borderLeft: `3px solid ${color}`, opacity: 0.85 }}>
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: 'pulse 1.5s infinite' }}></div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: color }}>{agentName}</span>
                      <span style={{ fontSize: 10, color: C.textMuted, fontStyle: 'italic' }}>正在思考...</span>
                      {roundThinking.length > 0 && (
                        <span style={{ fontSize: 9, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, color: C.textSecondary }}>
                          {roundThinking.length} 个思考步骤
                        </span>
                      )}
                    </div>
                    {/* 思考链展开 */}
                    {roundThinking.length > 0 && (
                      <div style={{ padding: '0 14px 10px', borderTop: `1px dashed ${C.border}` }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 6, marginTop: 8 }}>
                          思考链 (Chain of Thought)
                        </div>
                        {roundThinking.map((step, stepIdx) => (
                          <div key={stepIdx} style={{ 
                            background: '#f8fafc', 
                            borderRadius: 6, 
                            padding: '8px 10px', 
                            marginBottom: 6,
                            borderLeft: `2px solid ${step.phase === 'analysis' ? '#3b82f6' : step.phase === 'strategy' ? '#f59e0b' : '#10b981'}`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ 
                                fontSize: 9, 
                                fontWeight: 600, 
                                color: step.phase === 'analysis' ? '#3b82f6' : step.phase === 'strategy' ? '#f59e0b' : '#10b981',
                                textTransform: 'uppercase'
                              }}>
                                {step.phase === 'analysis' ? '分析' : step.phase === 'strategy' ? '策略' : '输出'}
                              </span>
                              <span style={{ fontSize: 9, color: C.textMuted }}>
                                {new Date(step.timestamp).toLocaleTimeString()}
                              </span>
                              {step.confidence !== undefined && (
                                <span style={{ fontSize: 9, color: C.textMuted }}>
                                  置信度: {(step.confidence * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                              {step.content}
                            </div>
                            {step.factors && step.factors.length > 0 && (
                              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {step.factors.map((factor, fIdx) => (
                                  <span key={fIdx} style={{ 
                                    fontSize: 9, 
                                    background: '#e5e7eb', 
                                    padding: '1px 5px', 
                                    borderRadius: 3,
                                    color: C.textSecondary
                                  }}>
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              if (event.type === 'agent_speaking') {
                const agentIdx = agents.findIndex(a => a.id === d.agentId);
                const color = AGENT_COLORS[agentIdx >= 0 ? agentIdx % AGENT_COLORS.length : 0];
                const agentName = String(d.agentName || '');
                const agent = agents.find(a => a.id === d.agentId);
                // 获取该Agent相关的规则评估日志
                const agentRuleLogs = ruleEngine.evaluationLog.filter(log => log.agentId === d.agentId && log.round === event.round);
                return (
                  <div key={idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', borderLeft: `3px solid ${color}` }}>
                    {/* 第一层：台面上的博弈对话 */}
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{agentName.charAt(0)}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{agentName}</span>
                        <span style={{ fontSize: 10, padding: '2px 6px', background: C.bg, color: C.textMuted, borderRadius: 3 }}>台面发言</span>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.7, color: C.text, marginBottom: 10, padding: '10px 12px', background: C.bg, borderRadius: 6, borderLeft: `2px solid ${color}` }}>
                        {d.visibleText}
                      </div>
                      {d.hiddenStrategy && (
                        <div style={{ fontSize: 13, lineHeight: 1.6, color: C.warning, padding: '10px 12px', background: C.accentLight, borderRadius: 6, borderLeft: `2px solid ${C.accent}` }}>
                          <span style={{ fontWeight: 600 }}>潜台词：</span>{d.hiddenStrategy}
                        </div>
                      )}
                    </div>
                    
                    {/* 第二层：底层指标对冲关系 */}
                    <div style={{ background: '#f8f9fa', borderTop: `1px dashed ${C.border}`, padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed' }}></span>
                        底层指标权衡 (决策依据)
                      </div>
                      
                      {/* Agent当前关键指标 */}
                      {agent && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          {/* 偏好权重 */}
                          <div style={{ background: '#fff', borderRadius: 6, padding: 8, border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#d97706', marginBottom: 6 }}>偏好权重</div>
                            {Object.entries(agent.preferences).slice(0, 4).map(([key, val]) => (
                              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                                <span style={{ fontSize: 10, color: C.textSecondary }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <div style={{ width: 50, height: 4, background: '#e5e7eb', borderRadius: 2 }}>
                                    <div style={{ width: `${(val as number) * 100}%`, height: '100%', background: '#d97706', borderRadius: 2 }}></div>
                                  </div>
                                  <span style={{ fontSize: 9, color: C.textMuted, fontFamily: 'monospace' }}>{((val as number) * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* 资源禀赋 */}
                          <div style={{ background: '#fff', borderRadius: 6, padding: 8, border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#1a73e8', marginBottom: 6 }}>资源禀赋</div>
                            {Object.entries(agent.resources).map(([key, val]) => (
                              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                                <span style={{ fontSize: 10, color: C.textSecondary }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <div style={{ width: 50, height: 4, background: '#e5e7eb', borderRadius: 2 }}>
                                    <div style={{ width: `${(val as number) * 100}%`, height: '100%', background: '#1a73e8', borderRadius: 2 }}></div>
                                  </div>
                                  <span style={{ fontSize: 9, color: C.textMuted, fontFamily: 'monospace' }}>{((val as number) * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 环境因素影响 */}
                      <div style={{ background: '#fff', borderRadius: 6, padding: 8, border: '1px solid #e5e7eb', marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', marginBottom: 6 }}>当前环境影响</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: C.textMuted }}>中央权威</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#c41e3a' }}>{(environment.political.centralAuthority * 100).toFixed(0)}%</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: C.textMuted }}>财政压力</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#d97706' }}>{(environment.economic.fiscalPressure * 100).toFixed(0)}%</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: C.textMuted }}>舆论压力</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#ec4899' }}>{(environment.social.opinionPressure * 100).toFixed(0)}%</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: C.textMuted }}>制度完善</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1' }}>{(environment.institutional.regulationCompleteness * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>

                      {/* 触发的规则 */}
                      {agentRuleLogs.length > 0 && (
                        <div style={{ background: '#f5f3ff', borderRadius: 6, padding: 8, border: '1px solid #ddd6fe' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', marginBottom: 6 }}>触发的运算规则</div>
                          {agentRuleLogs.map((log, li) => {
                            const rule = ruleEngine.rules.find(r => r.id === log.ruleId);
                            return (
                              <div key={li} style={{ fontSize: 10, color: C.text, padding: '4px 0', borderBottom: li < agentRuleLogs.length - 1 ? '1px solid #ede9fe' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: rule?.color || '#7c3aed' }}></span>
                                  <span style={{ fontWeight: 600 }}>{log.ruleName}</span>
                                  <span style={{ color: log.conditionsMet ? '#16a34a' : '#dc2626', fontSize: 9 }}>{log.conditionsMet ? '✓ 已触发' : '✗ 未触发'}</span>
                                </div>
                                {log.conditionDetails.length > 0 && (
                                  <div style={{ marginTop: 2, paddingLeft: 14, fontSize: 9, color: C.textMuted, fontFamily: 'monospace' }}>
                                    {log.conditionDetails.map((cd, ci) => (
                                      <span key={ci} style={{ marginRight: 8, color: cd.met ? '#16a34a' : '#dc2626' }}>
                                        {cd.path.split('.').pop()}: {(cd.actualValue * 100).toFixed(0)}% {cd.operator === 'gte' ? '≥' : cd.operator} {(cd.threshold * 100).toFixed(0)}%
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 如果没有规则日志，显示提示 */}
                      {agentRuleLogs.length === 0 && (
                        <div style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', padding: 8 }}>
                          规则评估日志将在模拟运行后显示
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              if (event.type === 'consensus_update') {
                return (
                  <div key={idx} style={{ background: C.successLight, border: `1px solid ${C.success}`, borderRadius: 8, padding: 12, textAlign: 'center', fontSize: 13, color: C.success }}>
                    共识度更新: {d.consensusScore}%
                  </div>
                );
              }
              if (event.type === 'round_summary') {
                const summary = d as unknown as { roundId: number; disputes: string[]; consensus: string[]; indicatorInteractions: string[]; ruleInfluences: string[] };
                return (
                  <div key={idx} style={{ background: '#fff', border: `2px solid ${C.accent}`, borderRadius: 10, padding: 16, marginTop: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      📋 本轮小结
                    </div>
                    {summary.disputes.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.danger, marginBottom: 6 }}>🔥 核心争议点</div>
                        {summary.disputes.map((dispute: string, i: number) => (
                          <div key={i} style={{ fontSize: 12, color: C.text, padding: '4px 0', paddingLeft: 12, borderLeft: `2px solid ${C.danger}` }}>{dispute}</div>
                        ))}
                      </div>
                    )}
                    {summary.consensus.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.success, marginBottom: 6 }}>✅ 达成共识</div>
                        {summary.consensus.map((item: string, i: number) => (
                          <div key={i} style={{ fontSize: 12, color: C.text, padding: '4px 0', paddingLeft: 12, borderLeft: `2px solid ${C.success}` }}>{item}</div>
                        ))}
                      </div>
                    )}
                    {summary.indicatorInteractions.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 6 }}>⚖️ 指标相互作用</div>
                        {summary.indicatorInteractions.map((item: string, i: number) => (
                          <div key={i} style={{ fontSize: 12, color: C.text, padding: '4px 0', paddingLeft: 12, borderLeft: `2px solid ${C.primary}` }}>{item}</div>
                        ))}
                      </div>
                    )}
                    {summary.ruleInfluences.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 6 }}>📏 规则影响</div>
                        {summary.ruleInfluences.map((item: string, i: number) => (
                          <div key={i} style={{ fontSize: 12, color: C.text, padding: '4px 0', paddingLeft: 12, borderLeft: `2px solid ${C.accent}` }}>{item}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              if (event.type === 'simulation_end') {
                return (
                  <div key={idx} style={{ background: `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})`, border: `2px solid ${C.primary}`, borderRadius: 10, padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 8 }}>博弈结束</div>
                    <div style={{ fontSize: 13, color: C.textSecondary }}>最终共识度: {d.finalConsensus}%</div>
                  </div>
                );
              }
              if (event.type === 'error') {
                return (
                  <div key={idx} style={{ background: C.dangerLight, border: `1px solid ${C.danger}`, borderRadius: 8, padding: 12, fontSize: 13, color: C.danger }}>
                    错误: {d.error}
                  </div>
                );
              }
              return null;
            })}
            <div ref={eventsEndRef} />
          </div>

          {error && <div style={{ marginTop: 16, padding: 12, background: C.dangerLight, border: `1px solid ${C.danger}`, borderRadius: 8, fontSize: 13, color: C.danger }}>错误: {error}</div>}
        </main>
      </div>

      {/* Agent编辑面板 */}
      {selectedAgent && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: 420, height: '100vh', background: C.card, boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', zIndex: 100, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.text }}>编辑智能体</h2>
            <button onClick={() => setSelectedAgentId(null)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>

          {/* 基本信息 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>基本信息</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>名称</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>角色定位</label>
                <textarea value={editRole} onChange={e => setEditRole(e.target.value)} rows={2} style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>层级</label>
                  <select value={editLevel} onChange={e => setEditLevel(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text }}>
                    <option value="central">中央</option>
                    <option value="provincial">省级</option>
                    <option value="municipal">市级</option>
                    <option value="local">地方</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>权力类型</label>
                  <select value={editPowerType} onChange={e => setEditPowerType(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text }}>
                    <option value="functional">职能型</option>
                    <option value="hierarchical">层级型</option>
                    <option value="regulatory">监管型</option>
                    <option value="advisory">顾问型</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>管辖领域（用顿号分隔）</label>
                <input value={editJurisdiction} onChange={e => setEditJurisdiction(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="veto" checked={editVetoPower} onChange={e => setEditVetoPower(e.target.checked)} />
                <label htmlFor="veto" style={{ fontSize: 13, color: C.text }}>拥有一票否决权</label>
              </div>
            </div>
          </div>

          {/* 偏好权重 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>偏好权重</div>
            {Object.entries(selectedAgent.preferences).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: C.textMuted, width: 80 }}>{key}</span>
                <input type="range" min={0} max={1} step={0.1} value={value} onChange={e => updatePreference(selectedAgent.id, key, parseFloat(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: C.text, width: 30, textAlign: 'right' }}>{(value as number).toFixed(1)}</span>
              </div>
            ))}
          </div>

          {/* 权力配置 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>权力配置</div>
            {Object.entries(selectedAgent.power).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: C.textMuted, width: 80 }}>{key}</span>
                <input type="range" min={0} max={1} step={0.1} value={value} onChange={e => updatePower(selectedAgent.id, key, parseFloat(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: C.text, width: 30, textAlign: 'right' }}>{(value as number).toFixed(1)}</span>
              </div>
            ))}
          </div>

          {/* 激励因素 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>激励因素</span>
              <button onClick={() => addIncentive(selectedAgent.id)} style={{ padding: '4px 8px', background: C.primaryLight, color: C.primary, border: `1px solid ${C.primary}`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ 添加</button>
            </div>
            {selectedAgent.incentives.map((inc, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input value={inc.type} onChange={e => updateIncentive(selectedAgent.id, idx, 'type', e.target.value)} style={{ flex: 1, padding: '6px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, color: C.text }} placeholder="类型" />
                <input type="number" min={0} max={1} step={0.1} value={inc.intensity} onChange={e => updateIncentive(selectedAgent.id, idx, 'intensity', parseFloat(e.target.value))} style={{ width: 50, padding: '6px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, color: C.text }} />
                <input value={inc.source} onChange={e => updateIncentive(selectedAgent.id, idx, 'source', e.target.value)} style={{ flex: 2, padding: '6px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, color: C.text }} placeholder="来源" />
                <button onClick={() => removeIncentive(selectedAgent.id, idx)} style={{ width: 20, height: 20, borderRadius: 4, background: 'transparent', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>

          {/* 硬约束 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.danger }}>硬约束（不可谈判）</span>
              <button onClick={() => addHardConstraint(selectedAgent.id)} style={{ padding: '4px 8px', background: C.dangerLight, color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ 添加</button>
            </div>
            {(selectedAgent.hardConstraints || []).map((c, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                <input value={c} onChange={e => updateHardConstraint(selectedAgent.id, idx, e.target.value)} style={{ flex: 1, padding: '6px 8px', background: C.dangerLight, border: `1px solid ${C.danger}`, borderRadius: 4, fontSize: 11, color: C.text }} />
                <button onClick={() => removeHardConstraint(selectedAgent.id, idx)} style={{ width: 20, height: 20, borderRadius: 4, background: 'transparent', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>

          {/* 软约束 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.warning }}>软约束（可灵活处理）</span>
              <button onClick={() => addSoftConstraint(selectedAgent.id)} style={{ padding: '4px 8px', background: C.warningLight, color: C.warning, border: `1px solid ${C.warning}`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ 添加</button>
            </div>
            {(selectedAgent.softConstraints || []).map((c, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                <input value={c} onChange={e => updateSoftConstraint(selectedAgent.id, idx, e.target.value)} style={{ flex: 1, padding: '6px 8px', background: C.warningLight, border: `1px solid ${C.warning}`, borderRadius: 4, fontSize: 11, color: C.text }} />
                <button onClick={() => removeSoftConstraint(selectedAgent.id, idx)} style={{ width: 20, height: 20, borderRadius: 4, background: 'transparent', border: 'none', color: C.warning, cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>

          {/* 行动目标 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>行动目标</span>
              <button onClick={() => addActionGoal(selectedAgent.id)} style={{ padding: '4px 8px', background: C.primaryLight, color: C.primary, border: `1px solid ${C.primary}`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ 添加</button>
            </div>
            {(selectedAgent.actionGoals || []).map((g, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                <input value={g} onChange={e => updateActionGoal(selectedAgent.id, idx, e.target.value)} style={{ flex: 1, padding: '6px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, color: C.text }} />
                <button onClick={() => removeActionGoal(selectedAgent.id, idx)} style={{ width: 20, height: 20, borderRadius: 4, background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>

          {/* API配置 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>AI模型配置</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>API密钥</label>
                <input 
                  type="password"
                  value={selectedAgent.apiConfig?.apiKey || ''} 
                  onChange={e => {
                    const currentConfig = selectedAgent.apiConfig || createDefaultApiConfig();
                    const newConfig = { ...currentConfig, provider: currentConfig.provider || 'deepseek', apiKey: e.target.value };
                    const updated = agents.map(a => a.id === selectedAgent.id ? { ...a, apiConfig: newConfig } : a);
                    setAgents(updated);
                    saveApiConfigsToStorage(updated);
                  }}
                  placeholder="sk-..."
                  style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text, boxSizing: 'border-box', fontFamily: 'monospace' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>API地址</label>
                <input 
                  value={selectedAgent.apiConfig?.baseUrl || ''} 
                  onChange={e => {
                    const currentConfig = selectedAgent.apiConfig || createDefaultApiConfig();
                    const newConfig = { ...currentConfig, provider: currentConfig.provider || 'deepseek', baseUrl: e.target.value };
                    const updated = agents.map(a => a.id === selectedAgent.id ? { ...a, apiConfig: newConfig } : a);
                    setAgents(updated);
                    saveApiConfigsToStorage(updated);
                  }}
                  placeholder="https://api.deepseek.com/chat/completions"
                  style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text, boxSizing: 'border-box', fontFamily: 'monospace' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>模型选择</label>
                <select 
                  value={selectedAgent.apiConfig?.model || 'deepseek-chat'} 
                  onChange={e => {
                    const currentConfig = selectedAgent.apiConfig || createDefaultApiConfig();
                    const newConfig = { ...currentConfig, provider: currentConfig.provider || 'deepseek', model: e.target.value };
                    const updated = agents.map(a => a.id === selectedAgent.id ? { ...a, apiConfig: newConfig } : a);
                    setAgents(updated);
                    saveApiConfigsToStorage(updated);
                  }}
                  style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text }}
                >
                  <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                  <option value="deepseek-reasoner">DeepSeek Reasoner (R1)</option>
                  <option value="deepseek-chat-v2">DeepSeek Chat V2</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Temperature</label>
                  <input 
                    type="number" 
                    min={0} 
                    max={2} 
                    step={0.1} 
                    value={selectedAgent.apiConfig?.temperature ?? 0.7} 
                    onChange={e => {
                      const currentConfig = selectedAgent.apiConfig || createDefaultApiConfig();
                      const newConfig = { ...currentConfig, provider: currentConfig.provider || 'deepseek', temperature: parseFloat(e.target.value) };
                      setAgents(agents.map(a => a.id === selectedAgent.id ? { ...a, apiConfig: newConfig } : a));
                      saveApiConfigsToStorage(agents.map(a => a.id === selectedAgent.id ? { ...a, apiConfig: newConfig } : a));
                    }}
                    style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text, boxSizing: 'border-box' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.textMuted, display: 'block', marginBottom: 4 }}>Max Tokens</label>
                  <input 
                    type="number" 
                    min={100} 
                    max={8000} 
                    step={100} 
                    value={selectedAgent.apiConfig?.maxTokens ?? 2000} 
                    onChange={e => {
                      const currentConfig = selectedAgent.apiConfig || createDefaultApiConfig();
                      const newConfig = { ...currentConfig, provider: currentConfig.provider || 'deepseek', maxTokens: parseInt(e.target.value) };
                      setAgents(agents.map(a => a.id === selectedAgent.id ? { ...a, apiConfig: newConfig } : a));
                      saveApiConfigsToStorage(agents.map(a => a.id === selectedAgent.id ? { ...a, apiConfig: newConfig } : a));
                    }}
                    style={{ width: '100%', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text, boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, padding: 8, background: C.bg, borderRadius: 6 }}>
                💡 每个Agent可以使用不同的API密钥和模型，便于对比不同模型的决策差异
              </div>
            </div>
          </div>

          <button onClick={saveAgentEdit} style={{ width: '100%', padding: '12px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>保存修改</button>
        </div>
      )}

      {/* 环境设定弹窗 */}
      {showEnvironment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowEnvironment(false)}>
          <div style={{ width: 600, maxHeight: '80vh', background: C.card, borderRadius: 12, padding: 24, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>环境设定</h2>
              <button onClick={() => setShowEnvironment(false)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {(['political', 'economic', 'social', 'institutional'] as const).map(dim => (
                <div key={dim} style={{ background: C.bg, borderRadius: 8, padding: 16, border: `1px solid ${C.border}` }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', color: C.text }}>
                    {dim === 'political' ? '政治环境' : dim === 'economic' ? '经济环境' : dim === 'social' ? '社会环境' : '制度环境'}
                  </h3>
                  {Object.entries(environment[dim]).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>
                        <span>{key === 'centralAuthority' ? '中央权威强度' : key === 'policyClarity' ? '政策信号清晰度' : key === 'supervisionIntensity' ? '监督强度' : key === 'politicalStability' ? '政治稳定性' : key === 'fiscalPressure' ? '财政压力' : key === 'growthRate' ? '经济增长率' : key === 'resourceAbundance' ? '资源充裕度' : key === 'marketMaturity' ? '市场成熟度' : key === 'publicAttention' ? '公众关注度' : key === 'opinionPressure' ? '舆论压力' : key === 'interestGroupActivity' ? '利益团体活跃度' : key === 'socialStability' ? '社会稳定度' : key === 'regulationCompleteness' ? '法规完善度' : key === 'accountabilityIntensity' ? '问责机制强度' : key === 'informationTransparency' ? '信息透明度' : '协调机制成熟度'}</span>
                        <span>{value.toFixed(2)}</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.05" value={value} onChange={e => setEnvironment(prev => ({ ...prev, [dim]: { ...prev[dim], [key]: parseFloat(e.target.value) } }))} style={{ width: '100%' }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 12, background: '#f0f7ff', borderRadius: 8, fontSize: 12, color: '#1a73e8' }}>
              <strong>环境影响：</strong>环境参数将直接影响Agent的激励权重、约束松紧度和决策倾向。
            </div>
          </div>
        </div>
      )}

      {/* 关系网络弹窗 */}
      {showRelationships && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowRelationships(false)}>
          <div style={{ width: 700, maxHeight: '80vh', background: C.card, borderRadius: 12, padding: 24, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>关系网络</h2>
              <button onClick={() => setShowRelationships(false)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setRelationships(prev => ({ ...prev, relationships: [...(prev.relationships || []), { from: agents[0]?.id || '', to: agents[1]?.id || '', type: 'hierarchical', strength: 0.7, trust: 0.5, infoFlow: 'bidirectional', powerAsymmetry: 0.3, history: 'neutral' }] }))} style={{ padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #16a34a', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ 添加关系</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(relationships.relationships || []).map((rel, idx) => (
                <div key={idx} style={{ background: C.bg, borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <select value={rel.from} onChange={e => setRelationships(prev => ({ ...prev, relationships: (prev.relationships || []).map((r, i) => i === idx ? { ...r, from: e.target.value } : r) }))} style={{ flex: 1, padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 12 }}>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <span style={{ color: C.textSecondary, fontSize: 12 }}>→</span>
                    <select value={rel.to} onChange={e => setRelationships(prev => ({ ...prev, relationships: (prev.relationships || []).map((r, i) => i === idx ? { ...r, to: e.target.value } : r) }))} style={{ flex: 1, padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 12 }}>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button onClick={() => setRelationships(prev => ({ ...prev, relationships: (prev.relationships || []).filter((_, i) => i !== idx) }))} style={{ width: 24, height: 24, borderRadius: 4, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 4 }}>关系类型</div>
                      <select value={rel.type} onChange={e => setRelationships(prev => ({ ...prev, relationships: (prev.relationships || []).map((r, i) => i === idx ? { ...r, type: e.target.value as RelationshipType } : r) }))} style={{ width: '100%', padding: 4, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11 }}>
                        <option value="hierarchical">上下级</option>
                        <option value="peer">平级</option>
                        <option value="regulatory">监管</option>
                        <option value="competitive">竞争</option>
                        <option value="collaborative">协作</option>
                        <option value="advisory">咨询</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 4 }}>关系强度: {rel.strength.toFixed(2)}</div>
                      <input type="range" min="0" max="1" step="0.1" value={rel.strength} onChange={e => setRelationships(prev => ({ ...prev, relationships: (prev.relationships || []).map((r, i) => i === idx ? { ...r, strength: parseFloat(e.target.value) } : r) }))} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 4 }}>信任度: {rel.trust.toFixed(2)}</div>
                      <input type="range" min="0" max="1" step="0.1" value={rel.trust} onChange={e => setRelationships(prev => ({ ...prev, relationships: (prev.relationships || []).map((r, i) => i === idx ? { ...r, trust: parseFloat(e.target.value) } : r) }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#16a34a' }}>
              <strong>关系影响：</strong>关系网络决定Agent之间的互动模式、信息流动和权力不对称度。
            </div>
          </div>
        </div>
      )}

      {/* 添加角色弹窗 */}
      {showAddAgent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowAddAgent(false)}>
          <div style={{ width: 400, background: C.card, borderRadius: 12, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>添加新角色</h2>
              <button onClick={() => setShowAddAgent(false)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>角色ID（英文）</label>
                <input value={newAgent.id} onChange={e => setNewAgent(p => ({ ...p, id: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, color: C.text, boxSizing: 'border-box' }} placeholder="如: ndrc, moh" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>角色名称</label>
                <input value={newAgent.name} onChange={e => setNewAgent(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, color: C.text, boxSizing: 'border-box' }} placeholder="如: 国家发展和改革委员会" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>角色描述</label>
                <textarea value={newAgent.role} onChange={e => setNewAgent(p => ({ ...p, role: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, color: C.text, resize: 'vertical', boxSizing: 'border-box' }} placeholder="描述该角色的职能和定位" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>层级</label>
                <select value={newAgent.level} onChange={e => setNewAgent(p => ({ ...p, level: e.target.value as 'central' | 'provincial' | 'municipal' | 'local' }))} style={{ width: '100%', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, color: C.text }}>
                  <option value="central">中央</option>
                  <option value="provincial">省级</option>
                  <option value="municipal">市级</option>
                  <option value="local">地方</option>
                </select>
              </div>
              <button onClick={addAgent} style={{ width: '100%', padding: '12px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>添加角色</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 知识库面板 ===== */}
      {showKnowledgeBase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowKnowledgeBase(false)}>
          <div style={{ width: 800, maxHeight: '85vh', background: C.card, borderRadius: 12, padding: 24, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>知识库管理</h2>
              <button onClick={() => setShowKnowledgeBase(false)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            
            {/* 添加文档表单 */}
            <div style={{ background: '#f5f3ff', borderRadius: 8, padding: 16, marginBottom: 20, border: '1px solid #ddd6fe' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', marginBottom: 12 }}>添加知识文档</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 4 }}>文档标题</label>
                  <input value={newDoc.title} onChange={e => setNewDoc(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box' }} placeholder="如：新医改政策文件" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 4 }}>文档类型</label>
                  <select value={newDoc.type} onChange={e => setNewDoc(p => ({ ...p, type: e.target.value as KnowledgeDocType }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}>
                    <option value="policy">政策文件</option>
                    <option value="historical">历史文献</option>
                    <option value="academic">学术论文</option>
                    <option value="memo">回忆录</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 4 }}>文档内容 / 摘要</label>
                <textarea value={newDoc.content} onChange={e => setNewDoc(p => ({ ...p, content: e.target.value }))} rows={4} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} placeholder="粘贴政策文件、历史文献、论文摘要或回忆录内容..." />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 4 }}>标签（逗号分隔）</label>
                  <input value={newDoc.tags} onChange={e => setNewDoc(p => ({ ...p, tags: e.target.value }))} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box' }} placeholder="如：医改,财政,中央决策" />
                </div>
                <button onClick={() => {
                  if (!newDoc.title || !newDoc.content) return;
                  const doc: KnowledgeDocument = {
                    id: `doc_${Date.now()}`,
                    title: newDoc.title,
                    type: newDoc.type,
                    content: newDoc.content,
                    tags: newDoc.tags.split(',').map(t => t.trim()).filter(Boolean),
                    extractedRules: [],
                    createdAt: Date.now(),
                  };
                  setKnowledgeBase(prev => ({ documents: [...prev.documents, doc] }));
                  setNewDoc({ title: '', type: 'policy', content: '', tags: '' });
                }} style={{ padding: '8px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>添加文档</button>
              </div>
            </div>

            {/* 文档列表 */}
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 12 }}>已添加文档 ({knowledgeBase.documents.length})</div>
            {knowledgeBase.documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.textMuted, fontSize: 13 }}>
                暂无文档，请添加政策文件、历史文献或学术论文
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {knowledgeBase.documents.map(doc => (
                  <div key={doc.id} style={{ background: C.bg, borderRadius: 8, padding: 16, border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{doc.title}</span>
                        <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', background: doc.type === 'policy' ? '#fef3c7' : doc.type === 'academic' ? '#dbeafe' : '#f3e8ff', color: doc.type === 'policy' ? '#d97706' : doc.type === 'academic' ? '#2563eb' : '#7c3aed', borderRadius: 4 }}>
                          {doc.type === 'policy' ? '政策文件' : doc.type === 'academic' ? '学术论文' : doc.type === 'historical' ? '历史文献' : doc.type === 'memo' ? '回忆录' : '其他'}
                        </span>
                      </div>
                      <button onClick={() => setKnowledgeBase(prev => ({ documents: prev.documents.filter(d => d.id !== doc.id) }))} style={{ width: 24, height: 24, borderRadius: 4, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 14 }}>×</button>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, lineHeight: 1.6, maxHeight: 80, overflow: 'hidden' }}>{doc.content.slice(0, 200)}{doc.content.length > 200 ? '...' : ''}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {doc.tags.map((tag, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '2px 6px', background: C.borderLight, color: C.textSecondary, borderRadius: 3 }}>#{tag}</span>
                      ))}
                    </div>
                    {/* AI提取规则按钮 */}
                    <button onClick={async () => {
                      const res = await fetch('/api/simulate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          scenario: selectedScenario,
                          action: 'extract_rules',
                          documentContent: doc.content,
                        }),
                      });
                      const data = await res.json();
                      if (data.extractedRules) {
                        setKnowledgeBase(prev => ({
                          documents: prev.documents.map(d => d.id === doc.id ? { ...d, extractedRules: data.extractedRules } : d),
                        }));
                      }
                    }} style={{ marginTop: 8, padding: '4px 12px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
                      AI提取规则
                    </button>
                    {doc.extractedRules.length > 0 && (
                      <div style={{ marginTop: 8, padding: 8, background: '#f5f3ff', borderRadius: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>提取的规则：</div>
                        {doc.extractedRules.map((rule, i) => (
                          <div key={i} style={{ fontSize: 11, color: C.textSecondary, padding: '2px 0' }}>• {rule}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 规则引擎面板 ===== */}
      {showRuleEngine && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowRuleEngine(false)}>
          <div style={{ width: 900, maxHeight: '85vh', background: C.card, borderRadius: 12, padding: 24, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>规则管理</h2>
              <button onClick={() => setShowRuleEngine(false)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            
            {/* 博弈规则 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.primary }}></span>
                博弈规则 ({rules.length})
              </div>
              <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 12 }}>这些规则直接影响博弈结果。硬规则不可违反，软规则可灵活处理。</p>
              {rules.map(rule => (
                <div key={rule.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input value={rule.name} onChange={e => updateRule(rule.id, 'name', e.target.value)} style={{ flex: 1, padding: '6px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text }} placeholder="规则名称" />
                  <input value={rule.description} onChange={e => updateRule(rule.id, 'description', e.target.value)} style={{ flex: 2, padding: '6px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text }} placeholder="规则描述" />
                  <select value={rule.type} onChange={e => updateRule(rule.id, 'type', e.target.value)} style={{ padding: '6px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.text }}>
                    <option value="hard">硬规则</option>
                    <option value="soft">软规则</option>
                  </select>
                  <button onClick={() => deleteRule(rule.id)} style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              ))}
              <button onClick={addRule} style={{ padding: '6px 16px', background: C.accentLight, color: C.warning, border: `1px solid ${C.accent}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>+ 添加博弈规则</button>
            </div>

            {/* 分隔线 */}
            <div style={{ height: 1, background: C.border, margin: '20px 0' }}></div>

            {/* If-Then 规则引擎 */}
            <div style={{ fontSize: 14, fontWeight: 700, color: '#6366f1', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }}></span>
              If-Then 规则引擎 ({ruleEngine.rules.length})
            </div>
            
            {/* 添加规则按钮 */}
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => {
                const newRule: IfThenRule = {
                  id: `rule_${Date.now()}`,
                  name: '新规则',
                  description: '描述该规则的触发条件和效果',
                  priority: 5,
                  enabled: true,
                  category: 'environment',
                  color: '#6366f1',
                  conditions: [{ id: `c_${Date.now()}`, metricSource: 'environment', metricPath: 'political.centralAuthority', operator: 'gte', value: 0.5 }],
                  effects: [{ id: `e_${Date.now()}`, type: 'modify_preference_weight', target: 'agents.*.preferences.policyGoalAchievement', value: 1.0 }],
                };
                setEditingRule(newRule);
              }} style={{ padding: '8px 16px', background: '#f0f7ff', color: '#6366f1', border: '1px solid #6366f1', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ 添加If-Then规则</button>
            </div>

            {/* 规则分类展示 */}
            {(['environment', 'relationship', 'power', 'preference', 'constraint', 'discourse'] as const).map(category => {
              const categoryRules = ruleEngine.rules.filter(r => r.category === category);
              if (categoryRules.length === 0) return null;
              const categoryLabels = { environment: '环境规则', relationship: '关系规则', power: '权力规则', preference: '偏好规则', constraint: '约束规则', discourse: '话语规则' };
              const categoryColors = { environment: '#1a73e8', relationship: '#16a34a', power: '#6366f1', preference: '#d97706', constraint: '#dc2626', discourse: '#ec4899' };
              return (
                <div key={category} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: categoryColors[category], marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColors[category] }}></span>
                    {categoryLabels[category]} ({categoryRules.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {categoryRules.map(rule => (
                      <div key={rule.id} style={{ background: C.bg, borderRadius: 8, padding: 14, border: `1px solid ${rule.color || C.border}`, borderLeft: `4px solid ${rule.color || C.border}`, opacity: rule.enabled ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{rule.name}</span>
                            <span style={{ marginLeft: 8, fontSize: 11, color: C.textMuted }}>优先级: {rule.priority}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setEditingRule(rule)} style={{ padding: '4px 10px', background: '#f0f7ff', color: '#1a73e8', border: '1px solid #1a73e8', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>编辑</button>
                            <button onClick={() => setRuleEngine(prev => ({ ...prev, rules: prev.rules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r) }))} style={{ padding: '4px 10px', background: rule.enabled ? '#fef3c7' : '#f0fdf4', color: rule.enabled ? '#d97706' : '#16a34a', border: `1px solid ${rule.enabled ? '#d97706' : '#16a34a'}`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>{rule.enabled ? '禁用' : '启用'}</button>
                            <button onClick={() => setRuleEngine(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== rule.id) }))} style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>删除</button>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 10 }}>{rule.description}</div>
                        
                        {/* IF 条件 */}
                        <div style={{ background: '#fff', borderRadius: 6, padding: 10, marginBottom: 8, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>IF 触发条件 (全部满足)</div>
                          {rule.conditions.map((cond, i) => (
                            <div key={i} style={{ fontSize: 11, color: C.text, padding: '3px 0', fontFamily: 'monospace' }}>
                              <span style={{ color: '#6366f1' }}>{cond.metricSource}</span>.<span style={{ color: '#d97706' }}>{cond.metricPath}</span>{' '}
                              <span style={{ color: '#dc2626' }}>{cond.operator === 'gte' ? '≥' : cond.operator === 'lte' ? '≤' : cond.operator === 'gt' ? '>' : cond.operator === 'lt' ? '<' : cond.operator === 'eq' ? '=' : cond.operator}</span>{' '}
                              <span style={{ color: '#16a34a' }}>{typeof cond.value === 'boolean' ? String(cond.value) : cond.value}</span>
                              {cond.description && <span style={{ color: C.textMuted, marginLeft: 8 }}>{'// '}{cond.description}</span>}
                            </div>
                          ))}
                        </div>

                        {/* THEN 效果 */}
                        <div style={{ background: '#fff', borderRadius: 6, padding: 10, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>THEN 效果</div>
                          {rule.effects.map((effect, i) => (
                            <div key={i} style={{ fontSize: 11, color: C.text, padding: '3px 0', fontFamily: 'monospace' }}>
                              <span style={{ color: '#7c3aed' }}>{effect.type.replace(/_/g, ' ')}</span> → <span style={{ color: '#d97706' }}>{effect.target}</span>{' '}
                              <span style={{ color: '#1a73e8' }}>[{typeof effect.value === 'boolean' ? String(effect.value) : effect.value}]</span>
                              {effect.description && <span style={{ color: C.textMuted, marginLeft: 8 }}>{'// '}{effect.description}</span>}
                            </div>
                          ))}
                        </div>

                        {/* 评估日志 */}
                        {ruleEngine.evaluationLog.filter(log => log.ruleId === rule.id).length > 0 && (
                          <div style={{ marginTop: 8, background: '#f5f3ff', borderRadius: 6, padding: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', marginBottom: 4 }}>最近评估记录</div>
                            {ruleEngine.evaluationLog.filter(log => log.ruleId === rule.id).slice(-3).map((log, i) => (
                              <div key={i} style={{ fontSize: 10, color: C.textSecondary, padding: '2px 0' }}>
                                轮次{log.round} | {log.agentId} | {log.conditionsMet ? '✓ 触发' : '✗ 未触发'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== 规则编辑弹窗 ===== */}
      {editingRule && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={() => setEditingRule(null)}>
          <div style={{ width: 700, maxHeight: '85vh', background: C.card, borderRadius: 12, padding: 24, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: C.text }}>编辑规则</h2>
              <button onClick={() => setEditingRule(null)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 4 }}>规则名称</label>
                <input value={editingRule.name} onChange={e => setEditingRule({ ...editingRule, name: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 4 }}>分类</label>
                <select value={editingRule.category} onChange={e => setEditingRule({ ...editingRule, category: e.target.value as IfThenRule['category'] })} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}>
                  <option value="environment">环境规则</option>
                  <option value="relationship">关系规则</option>
                  <option value="power">权力规则</option>
                  <option value="preference">偏好规则</option>
                  <option value="constraint">约束规则</option>
                  <option value="discourse">话语规则</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 4 }}>规则描述</label>
              <textarea value={editingRule.description} onChange={e => setEditingRule({ ...editingRule, description: e.target.value })} rows={2} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 4 }}>优先级 (1-10)</label>
                <input type="number" min="1" max="10" value={editingRule.priority} onChange={e => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 5 })} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 4 }}>颜色标识</label>
                <input type="color" value={editingRule.color || '#6366f1'} onChange={e => setEditingRule({ ...editingRule, color: e.target.value })} style={{ width: '100%', height: 36, borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer' }} />
              </div>
            </div>

            {/* 条件编辑 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>IF 条件</label>
                <button onClick={() => setEditingRule({ ...editingRule, conditions: [...editingRule.conditions, { id: `c_${Date.now()}`, metricSource: 'environment', metricPath: '', operator: 'gte', value: 0.5 }] })} style={{ padding: '2px 8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ 添加条件</button>
              </div>
              {editingRule.conditions.map((cond, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 60px 80px 30px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <select value={cond.metricSource} onChange={e => {
                    const newConditions = [...editingRule.conditions];
                    newConditions[idx] = { ...cond, metricSource: e.target.value as RuleCondition['metricSource'] };
                    setEditingRule({ ...editingRule, conditions: newConditions });
                  }} style={{ padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11 }}>
                    <option value="environment">环境</option>
                    <option value="relationship">关系</option>
                    <option value="agent">Agent</option>
                    <option value="game_state">博弈状态</option>
                  </select>
                  <input value={cond.metricPath} onChange={e => {
                    const newConditions = [...editingRule.conditions];
                    newConditions[idx] = { ...cond, metricPath: e.target.value };
                    setEditingRule({ ...editingRule, conditions: newConditions });
                  }} placeholder="如: political.centralAuthority" style={{ padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11 }} />
                  <select value={cond.operator} onChange={e => {
                    const newConditions = [...editingRule.conditions];
                    newConditions[idx] = { ...cond, operator: e.target.value as RuleOperator };
                    setEditingRule({ ...editingRule, conditions: newConditions });
                  }} style={{ padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11 }}>
                    <option value="gte">≥</option>
                    <option value="lte">≤</option>
                    <option value="gt">&gt;</option>
                    <option value="lt">&lt;</option>
                    <option value="eq">=</option>
                  </select>
                  <input type="number" step="0.1" value={typeof cond.value === 'number' ? cond.value : 0} onChange={e => {
                    const newConditions = [...editingRule.conditions];
                    newConditions[idx] = { ...cond, value: parseFloat(e.target.value) || 0 };
                    setEditingRule({ ...editingRule, conditions: newConditions });
                  }} style={{ padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11 }} />
                  <button onClick={() => setEditingRule({ ...editingRule, conditions: editingRule.conditions.filter((_, i) => i !== idx) })} style={{ width: 24, height: 24, borderRadius: 4, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
                </div>
              ))}
            </div>

            {/* 效果编辑 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>THEN 效果</label>
                <button onClick={() => setEditingRule({ ...editingRule, effects: [...editingRule.effects, { id: `e_${Date.now()}`, type: 'modify_preference_weight', target: '', value: 1.0 }] })} style={{ padding: '2px 8px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #16a34a', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>+ 添加效果</button>
              </div>
              {editingRule.effects.map((effect, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 80px 30px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <select value={effect.type} onChange={e => {
                    const newEffects = [...editingRule.effects];
                    newEffects[idx] = { ...effect, type: e.target.value as RuleEffectType };
                    setEditingRule({ ...editingRule, effects: newEffects });
                  }} style={{ padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11 }}>
                    <option value="modify_preference_weight">修改偏好权重</option>
                    <option value="modify_resource">修改资源</option>
                    <option value="modify_relationship">修改关系</option>
                    <option value="modify_environment">修改环境</option>
                    <option value="enable_action">启用行动</option>
                    <option value="disable_action">禁用行动</option>
                    <option value="add_constraint">添加约束</option>
                    <option value="trigger_discourse">触发话术</option>
                    <option value="modify_consensus">修改共识度</option>
                  </select>
                  <input value={effect.target} onChange={e => {
                    const newEffects = [...editingRule.effects];
                    newEffects[idx] = { ...effect, target: e.target.value };
                    setEditingRule({ ...editingRule, effects: newEffects });
                  }} placeholder="目标路径" style={{ padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11 }} />
                  <input type="number" step="0.1" value={typeof effect.value === 'number' ? effect.value : 0} onChange={e => {
                    const newEffects = [...editingRule.effects];
                    newEffects[idx] = { ...effect, value: parseFloat(e.target.value) || 0 };
                    setEditingRule({ ...editingRule, effects: newEffects });
                  }} style={{ padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 11 }} />
                  <button onClick={() => setEditingRule({ ...editingRule, effects: editingRule.effects.filter((_, i) => i !== idx) })} style={{ width: 24, height: 24, borderRadius: 4, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: 12 }}>×</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => {
                setRuleEngine(prev => {
                  const existing = prev.rules.find(r => r.id === editingRule.id);
                  if (existing) {
                    return { ...prev, rules: prev.rules.map(r => r.id === editingRule.id ? editingRule : r) };
                  }
                  return { ...prev, rules: [...prev.rules, editingRule] };
                });
                setEditingRule(null);
              }} style={{ flex: 1, padding: 12, background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>保存规则</button>
              <button onClick={() => setEditingRule(null)} style={{ flex: 1, padding: 12, background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 决策追溯面板 ===== */}
      {showDecisionTrace && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowDecisionTrace(false)}>
          <div style={{ width: 850, maxHeight: '85vh', background: C.card, borderRadius: 12, padding: 24, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: C.text }}>决策追溯 (DeepSeek 思考过程可视化)</h2>
              <button onClick={() => setShowDecisionTrace(false)} style={{ width: 28, height: 28, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>

            {decisionTraces.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
                <div style={{ fontSize: 14 }}>暂无决策追溯记录</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>运行模拟后，每个Agent的决策过程将被记录在此</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {decisionTraces.map((trace, idx) => {
                  const agent = agents.find(a => a.id === trace.agentId);
                  return (
                    <div key={idx} style={{ background: C.bg, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
                      {/* 头部：Agent信息 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: agent ? AGENT_COLORS[agents.indexOf(agent) % AGENT_COLORS.length] : '#999' }}></span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{agent?.name || trace.agentName || trace.agentId}</span>
                          <span style={{ fontSize: 12, padding: '3px 10px', background: C.primaryLight, color: C.primary, borderRadius: 4, fontWeight: 600 }}>{trace.roundName || `轮次 ${trace.round + 1}`}</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.textSecondary }}>
                          {new Date(trace.timestamp).toLocaleTimeString()}
                        </div>
                      </div>

                      {/* DeepSeek 完整思考过程 */}
                      {trace.thinkingSteps && trace.thinkingSteps.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>🧠</span> DeepSeek 思考链 (Chain of Thought)
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {trace.thinkingSteps.map((step, si) => {
                              const phaseColors = {
                                analysis: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', label: '📊 分析阶段', icon: '🔍' },
                                strategy: { bg: '#fff7ed', border: '#f97316', text: '#9a3412', label: '🎯 策略阶段', icon: '♟️' },
                                output: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', label: '💬 输出阶段', icon: '📝' },
                              };
                              const colors = phaseColors[step.phase] || phaseColors.analysis;
                              return (
                                <div key={si} style={{ background: colors.bg, borderRadius: 8, padding: 14, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.border}` }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{colors.label}</span>
                                    <div style={{ display: 'flex', gap: 10, fontSize: 10, color: C.textSecondary }}>
                                      <span>置信度: <strong style={{ color: colors.text }}>{((step.confidence ?? 0.5) * 100).toFixed(0)}%</strong></span>
                                      <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, marginBottom: 8 }}>{step.content}</div>
                                  {step.details && (
                                    <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6, padding: '8px 12px', background: '#fff', borderRadius: 6, marginTop: 8 }}>
                                      <strong style={{ color: colors.text }}>详细推理：</strong>{step.details}
                                    </div>
                                  )}
                                  {step.factors && step.factors.length > 0 && (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                      {step.factors.map((factor, fi) => (
                                        <span key={fi} style={{ fontSize: 11, padding: '3px 8px', background: '#fff', borderRadius: 4, border: `1px solid ${colors.border}`, color: colors.text, fontWeight: 500 }}>{factor}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 输入上下文 */}
                      {trace.inputContext && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>📥</span> 输入上下文
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: '#faf5ff', borderRadius: 8, padding: 12, border: '1px solid #e9d5ff' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', marginBottom: 6 }}>模型配置</div>
                              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>
                                <div>模型: <strong>{trace.output?.model || 'deepseek-chat'}</strong></div>
                                <div>温度: {trace.output?.parameters?.temperature || 0.7}</div>
                                <div>最大Token: {trace.output?.parameters?.maxTokens || 800}</div>
                              </div>
                            </div>
                            {trace.inputContext.environmentSnapshot && (
                              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, border: '1px solid #bbf7d0' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 6 }}>环境状态</div>
                                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>
                                  {trace.inputContext.environmentSnapshot.political && (
                                    <div>政治权威: {(trace.inputContext.environmentSnapshot.political.centralAuthority || 0).toFixed(2)}</div>
                                  )}
                                  {trace.inputContext.environmentSnapshot.economic && (
                                    <div>财政压力: {(trace.inputContext.environmentSnapshot.economic.fiscalPressure || 0).toFixed(2)}</div>
                                  )}
                                  {trace.inputContext.environmentSnapshot.social && (
                                    <div>公众诉求: {(trace.inputContext.environmentSnapshot.social.publicDemand || 0).toFixed(2)}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 输出结果 */}
                      {trace.output && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>📤</span> 输出结果
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: C.primary, marginBottom: 6 }}>台面发言 (Visible Text)</div>
                              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{trace.output.visibleText}</div>
                            </div>
                            <div style={{ background: '#fff7ed', borderRadius: 8, padding: 12, border: '1px solid #fed7aa' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#9a3412', marginBottom: 6 }}>潜在策略 (Hidden Strategy)</div>
                              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{trace.output.hiddenStrategy}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 决策理由 */}
                      {trace.decisionRationale && (
                        <div style={{ background: '#fef3c7', borderRadius: 8, padding: 12, border: '1px solid #fde68a', marginTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>💡 决策理由</div>
                          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{trace.decisionRationale}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
