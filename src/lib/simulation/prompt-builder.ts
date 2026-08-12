// ============================================================
// Prompt 构建器 — 制度身份驱动 + 场面话/潜台词双层输出
// ============================================================

import type { AgentConfig, DiscourseAction, NegotiationRound, SimulationState, EnvironmentConfig, AgentRelationship, RelationshipNetwork } from './types';
import { RELATIONSHIP_TYPE_LABELS } from './types';

/** 偏好维度中文翻译映射 */
const PREFERENCE_LABELS: Record<string, string> = {
  // 环保督察
  policy_goal_achievement: '政策目标实现',
  political_stability: '政治稳定',
  institutional_authority: '机构权威',
  accountability: '问责执行',
  economic_growth: '经济增长',
  fiscal_stability: '财政稳定',
  policy_compliance: '政策服从度',
  employment_stability: '就业稳定',
  political_promotion: '晋升机会',
  regulatory_authority: '监管权威',
  environmental_quality: '环境质量',
  professional_reputation: '专业声誉',
  inter_departmental_coordination: '部门间协调',
  // 新医改
  inter_departmental_harmony: '部门间和谐',
  reform_comprehensiveness: '改革全面性',
  public_health_coverage: '公共卫生覆盖',
  medical_system_reform: '医疗体制改革',
  institutional_influence: '部门影响力',
  professional_authority: '专业权威',
  fiscal_expansion: '财政扩张意愿',
  fiscal_discipline: '财政纪律',
  budget_control: '预算控制',
  economic_stability: '经济稳定',
};

/** 资源维度中文翻译映射 */
const RESOURCE_LABELS: Record<string, string> = {
  political_capital: '政治资本',
  administrative_capacity: '行政执行力',
  information_access: '信息优势',
  legal_authority: '法律授权',
};

/** 层级中文映射 */
const LEVEL_LABELS: Record<string, string> = {
  central: '中央',
  provincial: '省级',
  municipal: '市级',
  local: '地方',
};

/** 权力类型中文映射 */
const POWER_TYPE_LABELS: Record<string, string> = {
  hierarchical: '等级制权力',
  functional: '职能权力',
  regulatory: '监管权力',
  advisory: '咨询权力',
};

/** 六维权力配置中文映射 */
const POWER_FIELD_LABELS: Record<string, string> = {
  agendaSetting: '议程设置权',
  veto: '否决权',
  resourceAllocation: '资源分配权',
  informationControl: '信息控制权',
  personnel: '人事权',
  personnelMobility: '人事调动权',
  enforcement: '执行强制权',
};

/** 话术风格参数中文映射 */
const DISCOURSE_FIELD_LABELS: Record<string, string> = {
  formalityLevel: '正式程度',
  deferenceToSuperior: '对上级的服从性',
  ambiguityPreference: '模糊措辞偏好',
  consensusSeeking: '寻求共识倾向',
  conflictAvoidance: '冲突回避倾向',
  technicalVocabulary: '技术术语使用频率',
  partyLanguageUsage: '党的语言使用频率',
  localInterestEmphasis: '地方利益强调程度',
  nationalAlignment: '与中央保持一致程度',
};

/** 偏好维度翻译 */
function translatePreference(key: string): string {
  return PREFERENCE_LABELS[key] || key;
}

/** 资源维度翻译 */
function translateResource(key: string): string {
  return RESOURCE_LABELS[key] || key;
}

/**
 * 构建 Agent 系统提示词 — 制度身份 + 场面话/潜台词输出格式
 */
export function buildSystemPrompt(
  agent: AgentConfig,
  environment?: EnvironmentConfig,
  relationships?: AgentRelationship[]
): string {
  const pos = agent.position;
  const inc = agent.incentives;
  const resp = agent.responsibilities;
  const cs = agent.constraintSet;
  const sections: string[] = [];

  // 偏好权重排序（从高到低）
  const sortedPrefs = Object.entries(agent.preferences)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${translatePreference(k)}(${v.toFixed(1)})`)
    .join('、');

  // 资源排序
  const sortedResources = Object.entries(agent.resources)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${translateResource(k)}(${v.toFixed(1)})`)
    .join('、');

  // 权力配置描述
  const powerSection = `
六、权力配置（你在博弈中的实际权力）
═══════════════════════════════════════
${Object.entries(agent.power)
  .filter(([k]) => POWER_FIELD_LABELS[k])
  .map(([k, v]) => `• ${POWER_FIELD_LABELS[k]}：${(v * 100).toFixed(0)}%`)
  .join('\n')}
${pos.vetoPower ? '• 特别说明：你拥有制度性一票否决权，这是你的底线筹码。' : ''}`;
  sections.push(powerSection);

  // 话术风格参数描述
  const styleParams = Object.entries(agent.discourseStyle)
    .filter(([k]) => k !== 'agentId' && DISCOURSE_FIELD_LABELS[k])
    .map(([k, v]) => `• ${DISCOURSE_FIELD_LABELS[k]}：${(Number(v) * 100).toFixed(0)}%`);
  sections.push(`
七、话术风格参数（发言必须贴合这些参数）
═══════════════════════════════════════
${styleParams.join('\n')}

说明：正式程度越高，语言越官方；模糊措辞偏好越高，越避免给出明确承诺；寻求共识倾向越高，越主动促成一致；冲突回避倾向越高，越避免正面交锋；党的语言使用频率越高，越多使用政治话语；与中央保持一致程度越高，越强调服从中央部署。`);

  // 环境描述
  let envSection = '';
  if (environment) {
    envSection = `
═══════════════════════════════════════
八、当前环境背景
═══════════════════════════════════════
【政治环境】
• 中央权威强度：${(environment.political.centralAuthority * 100).toFixed(0)}%
• 政策信号清晰度：${(environment.political.policySignalClarity * 100).toFixed(0)}%
• 监督强度：${(environment.political.supervisionIntensity * 100).toFixed(0)}%
• 政治稳定性：${(environment.political.politicalStability * 100).toFixed(0)}%

【经济环境】
• 财政压力：${(environment.economic.fiscalPressure * 100).toFixed(0)}%
• 经济增长率：${(environment.economic.economicGrowth * 100).toFixed(0)}%
• 资源充裕度：${(environment.economic.resourceAbundance * 100).toFixed(0)}%
• 市场成熟度：${(environment.economic.marketMaturity * 100).toFixed(0)}%

【社会环境】
• 公众关注度：${(environment.social.publicAttention * 100).toFixed(0)}%
• 舆论压力：${(environment.social.opinionPressure * 100).toFixed(0)}%
• 利益团体活跃度：${(environment.social.interestGroupActivity * 100).toFixed(0)}%
• 社会稳定度：${(environment.social.socialStability * 100).toFixed(0)}%

【制度环境】
• 法规完善度：${(environment.institutional.regulationCompleteness * 100).toFixed(0)}%
• 问责机制强度：${(environment.institutional.accountabilityStrength * 100).toFixed(0)}%
• 信息透明度：${(environment.institutional.informationTransparency * 100).toFixed(0)}%
• 协调机制成熟度：${(environment.institutional.coordinationMaturity * 100).toFixed(0)}%
`;
    sections.push(envSection.trim());
  }

  // 关系网络描述
  let relSection = '';
  if (relationships && relationships.length > 0) {
    const myRels = relationships.filter(r => r.from === agent.id || r.to === agent.id);
    if (myRels.length > 0) {
      relSection = `
═══════════════════════════════════════
九、关系网络（你与其他参与者的关系）
═══════════════════════════════════════
${myRels.map(r => {
  const otherId = r.from === agent.id ? r.to : r.from;
  const direction = r.from === agent.id ? '你对' : '对方对你';
  return `• ${direction}${otherId}：${RELATIONSHIP_TYPE_LABELS[r.type]}（强度${(r.strength * 100).toFixed(0)}%，信任度${(r.trust * 100).toFixed(0)}%）`;
}).join('\n')}
`;
      sections.push(relSection.trim());
    }
  }

  return `你是"${agent.name}"的模拟智能体。你正在参与一场中国政策过程的内部博弈模拟。

═══════════════════════════════════════
一、制度身份
═══════════════════════════════════════
• 角色定位：${agent.role}
• 行政层级：${LEVEL_LABELS[pos.level]}（级别${pos.rank}）
• 权力类型：${POWER_TYPE_LABELS[pos.powerType]}
• 管辖领域：${pos.jurisdiction.join('、')}
${pos.vetoPower ? '• 特殊权力：拥有一票否决权' : ''}
${pos.subordinateTo ? `• 上级机构：${pos.subordinateTo}` : ''}

═══════════════════════════════════════
二、核心职责与行动目标
═══════════════════════════════════════
• 法定职责：${resp.coreMandate}
• 本轮目标：
${resp.actionGoals.map(g => `  - ${g}`).join('\n')}
• 非正式惯例：
${resp.informalPractices.map(p => `  - ${p}`).join('\n')}

═══════════════════════════════════════
三、激励结构（驱动你行为的核心动力）
═══════════════════════════════════════
${inc.map(i => `• ${i.type}：强度 ${(i.intensity * 100).toFixed(0)}%，来源：${i.source}`).join('\n')}

═══════════════════════════════════════
四、约束体系（不可逾越的红线）
═══════════════════════════════════════
• 中央约束：${(cs.centralConstraints || []).join('；')}
• 财政约束：${(cs.fiscalConstraints || []).join('；')}
• 制度约束：${(cs.institutionalConstraints || []).join('；')}
• 社会约束：${(cs.socialConstraints || []).join('；')}

五、偏好权重（效用函数 U(a) = Σ w × g(a)）
═══════════════════════════════════════
${sortedPrefs}
${sections.join('\n')}

十、资源禀赋
═══════════════════════════════════════
${sortedResources}

十一、输出格式（严格遵守）
═══════════════════════════════════════
你的每次发言必须严格包含两部分，用以下格式输出：

【场面话】
（用中国政治官方语言说出你的立场。2-4句话，简洁有力。体现你的正式程度、服从性表达、模糊偏好、党的语言使用等风格特征。这是你说给在场所有人听的"公开表态"。）

【潜台词】
（用直白的大白话揭示你的真实意图。2-3句话。你到底在盘算什么？你的真实诉求是什么？你在用什么策略？你在回避什么？这是你内心真实的想法。）

注意：
- 场面话要符合你的话术风格参数（正式程度、党的语言频率、模糊偏好等）
- 潜台词要体现你的激励结构和偏好权重的真实驱动
- 场面话和潜台词之间可以存在落差（如：表面拥护实则拖延），这正是中国政治博弈的特征
- 不要输出任何多余的分析、解释或元评论`;
}

/**
 * 构建轮次提示词
 */
export function buildRoundPrompt(
  _agent: AgentConfig,
  round: NegotiationRound,
  state: SimulationState,
): string {
  const parts: string[] = [];

  parts.push(`当前是第${round.id + 1}轮谈判：「${round.name}」`);
  parts.push(`本轮议题：${round.description}`);

  // 如果有之前的发言记录
  if (state.interactionHistory.length > 0) {
    parts.push('\n前面的发言摘要：');
    state.interactionHistory.forEach((h: DiscourseAction) => {
      // 只展示场面话部分
      const visibleText = h.visibleText.substring(0, 120);
      parts.push(`- ${h.agentName}：${visibleText}...`);
    });
  }

  // 轮次特定指引
  switch (round.id) {
    case 0:
      parts.push('\n请解读当前政策信号，判断改革的真实优先级和政治决心。');
      break;
    case 1:
      parts.push('\n请明确声明你的核心目标、不可退让的底线、以及愿意妥协的空间。');
      break;
    case 2:
      parts.push('\n请提出你的具体方案，包括关键条款、实施路径和时间表。');
      break;
    case 3:
      parts.push('\n请针对分歧点进行协调，可以提出妥协方案或尝试建立联盟。');
      break;
    case 4:
      parts.push('\n这是最后一轮。请做出最终表态，明确你的最终立场和让步空间。');
      break;
    default:
      parts.push('\n请根据你的制度身份和当前态势，做出符合你利益的发言。');
  }

  return parts.join('\n');
}

/**
 * 构建共识评估提示词 — 简洁版
 */
export function buildConsensusPrompt(
  _state: SimulationState,
  _round: NegotiationRound,
): string {
  return `你是一个政策谈判分析员。根据各方发言，评估当前共识程度。

评估维度：
1. 各方立场是否趋于一致
2. 是否出现明确的妥协信号
3. 核心分歧是否缩小

请严格按以下JSON格式输出，不要输出任何其他内容：
{"score": 0.0到1.0之间的数字, "summary": "一句话总结当前共识状态"}`;
}
