// ============================================================
// 中国政策过程多智能体计算模拟平台 - 核心类型定义
// ============================================================

/** 六维权力配置 */
export interface PowerProfile {
  agendaSetting: number;       // 议程设置能力 [0,1]
  veto: number;                // 否决能力 [0,1]
  resourceAllocation: number;  // 资源分配能力 [0,1]
  informationControl: number;  // 信息控制能力 [0,1]
  personnel: number;           // 人事权 [0,1]
  enforcement: number;         // 执行强制能力 [0,1]
  [key: string]: number;       // 允许扩展字段
}

/** 话术风格参数 (9维) */
export interface DiscourseStyle {
  agentId?: string;              // Agent标识
  formalityLevel: number;        // 正式程度
  deferenceToSuperior: number;   // 对上级的服从性表达
  ambiguityPreference: number;   // 偏好模糊措辞
  consensusSeeking: number;      // 寻求共识倾向
  conflictAvoidance: number;     // 回避直接冲突
  technicalVocabulary: number;   // 技术术语使用
  partyLanguageUsage: number;    // 党的语言使用频率
  localInterestEmphasis: number; // 强调地方利益
  nationalAlignment: number;     // 与中央保持一致
  [key: string]: number | string | undefined; // 允许扩展字段
}

/** 结构性位置 — 制度身份的核心 */
export interface InstitutionalPosition {
  level: 'central' | 'provincial' | 'municipal' | 'local';
  powerType: 'hierarchical' | 'functional' | 'regulatory' | 'advisory';
  jurisdiction: string[];        // 管辖领域
  vetoPower: boolean;            // 是否拥有一票否决权
  subordinateTo?: string;        // 上级机构ID
  rank?: number;                 // 行政级别 1-5 (5最高)
}

/** 单项激励因素 */
export interface IncentiveItem {
  /** 激励类型 */
  type: 'political' | 'fiscal' | 'promotion' | 'professional' | 'accountability' | string;
  /** 激励强度 [0,1] */
  intensity: number;
  /** 激励来源描述 */
  source: string;
}

/** 激励结构 — 驱动Agent行为的激励因素列表 */
export type IncentiveStructure = IncentiveItem[];

/** 部门职责 — Agent的行动目标与职能范围 */
export interface DepartmentalResponsibility {
  /** 部门描述 */
  description?: string;
  /** 核心职责 — 法定职能 */
  coreMandate: string;
  /** 行动目标 — 本轮模拟中该Agent追求的具体目标 */
  actionGoals: string[];
  /** 非正式实践 — 不成文的行为惯例 */
  informalPractices: string[];
  [key: string]: string | string[] | undefined; // 允许扩展字段
}

/** 约束分类 — 支持硬约束和软约束 */
export interface ConstraintSet {
  /** 硬约束 — 不可谈判的底线规则 */
  hard?: string[];
  /** 软约束 — 灵活性的考量因素 */
  soft?: string[];
  /** 来自中央的约束 — 政治红线 */
  centralConstraints?: string[];
  /** 来自财政的约束 — 预算硬约束 */
  fiscalConstraints?: string[];
  /** 来自制度的约束 — 程序性约束 */
  institutionalConstraints?: string[];
  /** 来自社会的约束 — 舆论/稳定压力 */
  socialConstraints?: string[];
  [key: string]: string[] | undefined; // 允许扩展字段
}

/** 智能体定义 */
export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  level: 'central' | 'provincial' | 'municipal' | 'local';
  rank?: number;                 // 行政级别 1-5
  /** 结构性位置 */
  position: InstitutionalPosition;
  /** 激励结构 */
  incentives: IncentiveStructure;
  /** 部门职责 */
  responsibilities: DepartmentalResponsibility;
  /** 行为约束（分类） */
  constraintSet: ConstraintSet;
  /** 偏好权重 — 效用函数 U(a) = Σ wᵢ × gᵢ(a) */
  preferences: Record<string, number>;
  /** 资源禀赋 */
  resources: Record<string, number>;
  /** 六维权力配置 */
  power: PowerProfile;
  /** 话术风格 */
  discourseStyle: DiscourseStyle;
  /** API配置 - 每个Agent独立的AI模型配置 */
  apiConfig?: AgentApiConfig;
  /** 兼容性：保留旧的 constraints 字段 */
  constraints: string[];
  /** 硬约束 — 不可谈判的底线规则 */
  hardConstraints?: string[];
  /** 软约束 — 灵活性的考量因素 */
  softConstraints?: string[];
  /** 行动目标列表 */
  actionGoals?: string[];
}

/** Agent API 配置 */
export interface AgentApiConfig {
  provider: 'deepseek' | 'openai' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  /** 模型参数 */
  temperature: number;
  maxTokens: number;
  topP: number;
  /** 是否启用思考过程记录 */
  enableThinkingTrace: boolean;
  /** 思考过程记录 */
  thinkingTrace: ThinkingTraceEntry[];
}

/** 思考过程记录条目 */
export interface ThinkingTraceEntry {
  timestamp: number;
  round: number;
  arena: string;
  input: string;           // 输入prompt
  thinking: string;        // 模型思考过程（如有）
  output: string;          // 最终输出
  modelUsed: string;       // 使用的模型
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number;        // 耗时（毫秒）
}

/** 思考步骤 */
export interface ThinkingStep {
  phase: 'analysis' | 'strategy' | 'output';
  content: string;
  details?: string;
  timestamp: number;
  factors?: string[];
  confidence?: number;
}

/** 思考历史记录 */
export interface ThinkingHistory {
  round: number;
  steps: ThinkingStep[];
}

/** 智能体运行时状态 */
export interface AgentState {
  config: AgentConfig;
  currentStance: string;
  hiddenStrategy: string;
  concessionHistory: number[];
  trustMap: Record<string, number>;
  thinkingHistory?: ThinkingHistory[];
}

/** 场域类型 */
export type ArenaType =
  | 'political_signal'
  | 'bureaucratic_bargaining'
  | 'expert_assessment'
  | 'public_consultation'
  | 'implementation'
  | 'feedback';

/** 场域定义 */
export interface ArenaConfig {
  type: ArenaType;
  name: string;
  description: string;
  participants: string[];
  maxRounds: number;
  decisionRule: 'consensus' | 'majority' | 'authority' | 'unanimous';
}

/** 单条发言 */
export interface DiscourseAction {
  agentId: string;
  agentName: string;
  arenaType: ArenaType;
  round: number;
  visibleText: string;
  hiddenStrategy: string;
  timestamp: number;
}

/** 场域输出 */
export interface ArenaOutput {
  arenaType: ArenaType;
  round: number;
  actions: DiscourseAction[];
  summary: string;
  consensusLevel: number; // [0,1]
  keyDecisions: string[];
}

/** Agent在轮次中的角色 */
export interface AgentRoundRole {
  agentId: string;
  role: string; // 该轮次中的角色描述
  speakingOrder: number; // 发言顺序
}

/** 谈判轮次 */
export interface NegotiationRound {
  id: number;
  name: string;
  description: string;
  speakingOrder: string[];
  arenaType: ArenaType;
  /** 各Agent在该轮次中的角色 */
  agentRoles?: AgentRoundRole[];
  /** 该轮次的核心议题 */
  keyTopic?: string;
  /** 该轮次的预期产出 */
  expectedOutcome?: string;
}

/** 轮次小结 */
export interface RoundSummary {
  roundId: number;
  roundName: string;
  /** 核心争议点 */
  keyDisputes: string[];
  /** 达成的共识 */
  consensus: string[];
  /** 各Agent立场变化 */
  stanceChanges: Array<{
    agentId: string;
    agentName: string;
    before: string;
    after: string;
  }>;
  /** 关键决策点 */
  keyDecisions: string[];
  /** 指标相互作用分析 */
  indicatorInteractions?: Array<{
    indicators: string[];
    effect: string;
    winner?: string;
  }>;
}

/** 协议定义 */
export interface ProtocolConfig {
  name: string;
  rounds: NegotiationRound[];
  deadlockThreshold: number;
  deadlockResolution: 'escalation' | 'decomposition' | 'failure';
}

/** 环境建模 - 政治环境 */
export interface PoliticalEnvironment {
  centralAuthority: number;      // 中央权威强度 [0-1]
  policySignalClarity: number;   // 政策信号清晰度 [0-1]
  supervisionIntensity: number;  // 监督强度 [0-1]
  politicalStability: number;    // 政治稳定性 [0-1]
}

/** 环境建模 - 经济环境 */
export interface EconomicEnvironment {
  fiscalPressure: number;        // 财政压力 [0-1]
  economicGrowth: number;        // 经济增长率 [0-1]
  resourceAbundance: number;     // 资源充裕度 [0-1]
  marketMaturity: number;        // 市场成熟度 [0-1]
}

/** 环境建模 - 社会环境 */
export interface SocialEnvironment {
  publicAttention: number;       // 公众关注度 [0-1]
  opinionPressure: number;       // 舆论压力 [0-1]
  interestGroupActivity: number; // 利益团体活跃度 [0-1]
  socialStability: number;       // 社会稳定度 [0-1]
}

/** 环境建模 - 制度环境 */
export interface InstitutionalEnvironment {
  regulationCompleteness: number;    // 法规完善度 [0-1]
  accountabilityStrength: number;    // 问责机制强度 [0-1]
  informationTransparency: number;   // 信息透明度 [0-1]
  coordinationMaturity: number;      // 协调机制成熟度 [0-1]
}

/** 环境配置（四维环境） */
export interface EnvironmentConfig {
  political: PoliticalEnvironment;
  economic: EconomicEnvironment;
  social: SocialEnvironment;
  institutional: InstitutionalEnvironment;
}

/** 关系类型 */
export type RelationshipType =
  | 'hierarchical'      // 上下级
  | 'supervisory'       // 监督
  | 'assessment'        // 考核
  | 'collaborative'     // 协作
  | 'competitive'       // 竞争
  | 'bargaining'        // 博弈
  | 'alliance'          // 联盟
  | 'regulatory'        // 监管
  | 'approval'          // 审批
  | 'resource'          // 资源分配
  | 'informational';    // 信息

/** Agent 关系 */
export interface AgentRelationship {
  from: string;          // 源 Agent ID
  to: string;            // 目标 Agent ID
  type: RelationshipType;
  strength: number;      // 关系强度 [0-1]
  trust: number;         // 信任程度 [0-1]
  powerAsymmetry: number; // 权力不对称度 [0-1]
  infoFlow: 'unidirectional' | 'bidirectional'; // 信息流动方向
  history: 'cooperative' | 'conflict' | 'neutral'; // 历史互动模式
}

/** 关系网络 */
export interface RelationshipNetwork {
  relationships: AgentRelationship[];
}

/** 场景配置 */
export interface ScenarioConfig {
  id: string;
  title: string;
  domain: string;
  description: string;
  agents: AgentConfig[];
  protocol: ProtocolConfig;
  /** 环境配置 */
  environment?: EnvironmentConfig;
  /** 关系网络 */
  relationships?: RelationshipNetwork;
  /** 兼容性字段 */
  agentCount?: number;
  roundCount?: number;
}

/** 模拟状态 — 供 prompt-builder 使用 */
export interface SimulationState {
  scenario: ScenarioConfig;
  currentRound: number;
  currentArena: ArenaType;
  agentStates: Record<string, AgentState>;
  interactionHistory: DiscourseAction[];
  institutionalMemory: Array<{ key: string; content: string }>;
}

/** 模拟会话 */
export interface SimulationSession {
  id: string;
  scenario: ScenarioConfig;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentRound: number;
  currentArena: ArenaType;
  agentStates: Record<string, AgentState>;
  history: ArenaOutput[];
  finalOutcome: Record<string, unknown> | null;
  createdAt: number;
  decisionTraces?: DecisionTrace[];
}

/** SSE 事件类型 */
export type SimulationEventType =
  | 'round_start'
  | 'agent_thinking'
  | 'agent_speaking'
  | 'round_end'
  | 'round_summary'
  | 'consensus_update'
  | 'simulation_end'
  | 'simulation_complete'
  | 'decision_trace'
  | 'error';

/** 博弈规则 */
export interface GameRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  type: string;
  condition?: string;
  effect?: string;
}

export interface SimulationEvent {
  type: SimulationEventType;
  round: number;
  arena: ArenaType;
  data: Record<string, unknown>;
  timestamp: number;
}

/** 关系类型标签映射 */
export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  hierarchical: '上下级',
  supervisory: '监督',
  assessment: '考核',
  collaborative: '协作',
  competitive: '竞争',
  bargaining: '博弈',
  alliance: '联盟',
  regulatory: '监管',
  approval: '审批',
  resource: '资源分配',
  informational: '信息',
};

// ============================================================
// 知识库系统 — 政策文件/历史文献/论文 → 规则提取
// ============================================================

/** 知识库文档类型 */
export type KnowledgeDocType = 'policy' | 'historical' | 'academic' | 'memo' | 'other';

/** 知识库文档 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  type: KnowledgeDocType;
  content: string;              // 文档原文或摘要
  source?: string;              // 来源（如文件名、URL）
  extractedRules: string[];     // 从文档中提取的规则描述
  tags: string[];               // 标签（用于关联到环境/关系/规则）
  createdAt: number;
}

/** 知识库 */
export interface KnowledgeBase {
  documents: KnowledgeDocument[];
}

// ============================================================
// 规则引擎 — 可编辑的 if-then 运算法则
// ============================================================

/** 规则条件操作符 */
export type RuleOperator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between' | 'in';

/** 规则条件 */
export interface RuleCondition {
  id: string;
  metricSource: 'environment' | 'relationship' | 'agent' | 'game_state';
  metricPath: string;           // 如 "political.centralAuthority" 或 "agents.ndrc.resources.politicalCapital"
  operator: RuleOperator;
  value: number | number[] | string | boolean;
  description?: string;         // 人类可读描述
}

/** 规则效果类型 */
export type RuleEffectType = 
  | 'modify_preference_weight'   // 修改偏好权重
  | 'modify_resource'            // 修改资源
  | 'modify_relationship'        // 修改关系
  | 'modify_environment'         // 修改环境
  | 'enable_action'              // 启用行动
  | 'disable_action'             // 禁用行动
  | 'add_constraint'             // 添加约束
  | 'trigger_discourse'          // 触发特定话术
  | 'modify_consensus';          // 修改共识度

/** 规则效果 */
export interface RuleEffect {
  id: string;
  type: RuleEffectType;
  target: string;               // 作用目标（如 agent id 或 metric path）
  value: number | string | boolean;
  description?: string;
}

/** If-Then 规则 */
export interface IfThenRule {
  id: string;
  name: string;                 // 规则名称
  description: string;          // 规则描述（人类可读）
  priority: number;             // 优先级（数字越大越优先）
  enabled: boolean;             // 是否启用
  sourceDocId?: string;         // 来源知识库文档ID
  conditions: RuleCondition[];  // 条件列表（AND关系）
  effects: RuleEffect[];        // 效果列表
  // 可视化相关
  color?: string;               // 规则在可视化中的颜色标识
  category: 'environment' | 'relationship' | 'power' | 'preference' | 'constraint' | 'discourse';
}

/** 规则集 */
export interface RuleEngine {
  rules: IfThenRule[];
  lastEvaluated: number | null;
  evaluationLog: RuleEvaluationLog[];
}

/** 规则评估日志 */
export interface RuleEvaluationLog {
  timestamp: number;
  round: number;
  agentId: string;
  ruleId: string;
  ruleName: string;
  conditionsMet: boolean;
  conditionDetails: {
    path: string;
    actualValue: number;
    operator: RuleOperator;
    threshold: number;
    met: boolean;
  }[];
  effectsApplied: RuleEffect[];
}

// ============================================================
// 指标影响链 — 环境 → 关系 → 主体 → 决策 的完整链路
// ============================================================

/** 指标影响节点 */
export interface MetricImpactNode {
  source: string;               // 来源指标路径
  target: string;               // 影响目标路径
  weight: number;               // 影响权重 [-1, 1]
  mechanism: string;            // 影响机制描述
  ruleId?: string;              // 关联的规则ID
}

/** 决策追溯记录 */
export interface DecisionTrace {
  id: string;
  agentId: string;
  agentName: string;
  round: number;
  roundName: string;
  timestamp: number;
  
  // 思考过程（DeepSeek完整思考链）
  thinkingSteps: ThinkingStep[];
  
  // 输入上下文
  inputContext: {
    systemPrompt: string;
    userPrompt: string;
    environmentSnapshot?: {
      political?: { centralAuthority?: number; policyPriority?: number };
      economic?: { fiscalPressure?: number; marketVitality?: number };
      social?: { publicDemand?: number; stabilitySensitivity?: number };
      institutional?: { ruleOfLaw?: number; policyContinuity?: number };
    };
    relationships?: { from: string; to: string; type: string; trust: number }[];
  };
  
  // 输出结果
  output: {
    visibleText: string;
    hiddenStrategy: string;
    model: string;
    parameters: {
      temperature: number;
      maxTokens: number;
    };
  };
  
  // 决策理由
  decisionRationale: string;
  
  // 兼容旧字段
  decision?: string;
  factors?: {
    metric: string;
    value: number;
    weight: number;
    impact: number;
    source: 'environment' | 'relationship' | 'agent' | 'rule';
  }[];
  triggeredRules?: string[];
  finalUtility?: number;
}

