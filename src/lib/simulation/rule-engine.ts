// ============================================================
// If-Then 规则引擎 — 环境/关系/主体/博弈状态 → 规则求值 → 效果应用
// ============================================================

import type {
  AgentConfig,
  AgentRelationship,
  EnvironmentConfig,
  IfThenRule,
  RelationshipNetwork,
  RuleCondition,
  RuleEffect,
  RuleEvaluationLog,
  RuleOperator,
} from './types';

/** 规则求值所需的博弈状态 */
export interface RuleGameState {
  round: number;
  consensusLevel: number;
  proposalConflictLevel: number;
}

/** 规则求值阶段 */
export type RulePhase = 'pre' | 'post';

/** 规则求值结果：变更后的基线副本 + 日志 + 附加效果 */
export interface RuleEvaluationResult {
  logs: RuleEvaluationLog[];
  agents: Record<string, AgentConfig>;
  environment: EnvironmentConfig;
  relationships: AgentRelationship[];
  consensusDelta: number;
  discourseHints: Record<string, string[]>;
}

interface RuleBaseline {
  agents: Record<string, AgentConfig>;
  environment?: EnvironmentConfig;
  relationships?: RelationshipNetwork;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

/** 按点号路径读取对象值，例如 political.centralAuthority */
function getPath(obj: Record<string, unknown> | undefined, path: string): unknown {
  if (!obj || !path) return undefined;
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** 将 effect.target 解析为通配/单主体模式 */
function parseAgentTarget(
  target: string,
  kind: 'preferences' | 'resources'
): { pattern: 'all' | 'specific'; agentId?: string; key: string } | null {
  const allMatch = target.match(new RegExp(`^agents\\.\\*\\.${kind}\\.(.+)$`));
  if (allMatch) return { pattern: 'all', key: allMatch[1] };
  const specificMatch = target.match(new RegExp(`^agents\\.([^.]+)\\.${kind}\\.(.+)$`));
  if (specificMatch) return { pattern: 'specific', agentId: specificMatch[1], key: specificMatch[2] };
  return null;
}

function parseAgentIdTarget(target: string): { pattern: 'all' | 'specific'; agentId?: string } | null {
  if (target === 'agents.*') return { pattern: 'all' };
  const match = target.match(/^agents\.([^.]+)$/);
  if (match) return { pattern: 'specific', agentId: match[1] };
  return null;
}

/** 条件值解析（按 metricSource） */
function resolveConditionValue(
  condition: RuleCondition,
  agent: AgentConfig,
  environment: EnvironmentConfig,
  relationships: AgentRelationship[],
  gameState: RuleGameState
): unknown {
  switch (condition.metricSource) {
    case 'environment':
      return getPath(environment as unknown as Record<string, unknown>, condition.metricPath);
    case 'game_state':
      return getPath(gameState as unknown as Record<string, unknown>, condition.metricPath);
    case 'agent':
      return getPath(agent as unknown as Record<string, unknown>, condition.metricPath);
    case 'relationship': {
      const rels = relationships.filter((r) => r.from === agent.id || r.to === agent.id);
      if (condition.metricPath === 'type') return rels.map((r) => r.type);
      if (condition.metricPath === 'trust') return rels.reduce((max, r) => Math.max(max, r.trust), 0);
      if (condition.metricPath === 'strength') return rels.reduce((max, r) => Math.max(max, r.strength), 0);
      return undefined;
    }
    default:
      return undefined;
  }
}

/** 单条件求值 */
function evaluateCondition(
  condition: RuleCondition,
  actual: unknown
): { met: boolean; actualValue: number | string | boolean | (number | string)[]; threshold: number | string | boolean | (number | string)[] } {
  const threshold = condition.value;
  const actualValue = actual as number | string | boolean | (number | string)[] | undefined;

  const asNumber = (v: unknown): number | null => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    return null;
  };

  const numeric = asNumber(actualValue);
  const thresholdNum = asNumber(threshold);

  let met = false;
  switch (condition.operator) {
    case 'gt':
      met = numeric !== null && thresholdNum !== null && numeric > thresholdNum;
      break;
    case 'lt':
      met = numeric !== null && thresholdNum !== null && numeric < thresholdNum;
      break;
    case 'gte':
      met = numeric !== null && thresholdNum !== null && numeric >= thresholdNum;
      break;
    case 'lte':
      met = numeric !== null && thresholdNum !== null && numeric <= thresholdNum;
      break;
    case 'between': {
      const range = Array.isArray(threshold) ? threshold.map(asNumber) : [];
      met =
        numeric !== null &&
        range.length === 2 &&
        range[0] !== null &&
        range[1] !== null &&
        numeric >= (range[0] as number) &&
        numeric <= (range[1] as number);
      break;
    }
    case 'eq': {
      if (Array.isArray(actualValue)) {
        met = actualValue.some((v) => String(v) === String(threshold));
      } else if (Array.isArray(threshold)) {
        met = threshold.some((v) => String(v) === String(actualValue));
      } else if (numeric !== null && thresholdNum !== null) {
        met = numeric === thresholdNum;
      } else {
        met = String(actualValue) === String(threshold);
      }
      break;
    }
    case 'in': {
      if (Array.isArray(threshold)) {
        if (Array.isArray(actualValue)) {
          met = actualValue.some((v) => threshold.some((t) => String(t) === String(v)));
        } else {
          met = threshold.some((t) => String(t) === String(actualValue));
        }
      }
      break;
    }
    default:
      met = false;
  }

  return {
    met,
    actualValue: actualValue ?? (null as unknown as number),
    threshold: threshold as number | string | boolean | (number | string)[],
  };
}

/** 应用单条效果，返回是否已应用及说明 */
function applyEffect(
  effect: RuleEffect,
  agentId: string,
  phase: RulePhase,
  ruleId: string,
  state: {
    agents: Record<string, AgentConfig>;
    environment: EnvironmentConfig;
    relationships: AgentRelationship[];
    consensusDelta: number;
    discourseHints: Record<string, string[]>;
    consensusAppliedRules: Set<string>;
  }
): RuleEffect[] {
  const applied: RuleEffect[] = [];

  switch (effect.type) {
    case 'modify_preference_weight': {
      const parsed = parseAgentTarget(effect.target, 'preferences');
      if (parsed && typeof effect.value === 'number') {
        const targets =
          parsed.pattern === 'all'
            ? Object.values(state.agents)
            : [state.agents[parsed.agentId as string]].filter(Boolean);
        for (const agent of targets) {
          const current = agent.preferences[parsed.key];
          if (typeof current === 'number') {
            agent.preferences[parsed.key] = clamp01(current * effect.value);
          }
        }
        applied.push(effect);
      }
      break;
    }
    case 'modify_resource': {
      const parsed = parseAgentTarget(effect.target, 'resources');
      if (parsed && typeof effect.value === 'number') {
        const targets =
          parsed.pattern === 'all'
            ? Object.values(state.agents)
            : [state.agents[parsed.agentId as string]].filter(Boolean);
        for (const agent of targets) {
          const current = agent.resources[parsed.key];
          if (typeof current === 'number') {
            agent.resources[parsed.key] = clamp01(current * effect.value);
          }
        }
        applied.push(effect);
      }
      break;
    }
    case 'modify_environment': {
      if (typeof effect.value === 'number') {
        const current = getPath(state.environment as unknown as Record<string, unknown>, effect.target);
        if (typeof current === 'number') {
          const keys = effect.target.split('.');
          const target =
            keys.reduce<Record<string, unknown>>((acc, key, idx) => {
              if (idx === keys.length - 1) return acc;
              const next = (acc[key] ?? undefined);
              return (typeof next === 'object' && next !== null ? next : {}) as Record<string, unknown>;
            }, state.environment as unknown as Record<string, unknown>);
          target[keys[keys.length - 1]] = clamp01(current + effect.value);
        }
        applied.push(effect);
      }
      break;
    }
    case 'modify_relationship': {
      const match = effect.target.match(/^([^.]+):([^.]+):(strength|trust)$/);
      if (match && typeof effect.value === 'number') {
        const [, from, to, field] = match;
        const rel = state.relationships.find((r) => r.from === from && r.to === to);
        if (rel) {
          if (field === 'strength') rel.strength = clamp01(effect.value);
          else rel.trust = clamp01(effect.value);
        }
        applied.push(effect);
      }
      break;
    }
    case 'modify_consensus': {
      // 共识类效果按规则去重（每轮每规则只计一次，避免匹配多个Agent时重复累加）
      if (phase === 'post' && typeof effect.value === 'number' && !state.consensusAppliedRules.has(ruleId)) {
        state.consensusAppliedRules.add(ruleId);
        state.consensusDelta += effect.value;
        applied.push(effect);
      }
      break;
    }
    case 'add_constraint': {
      const parsed = parseAgentIdTarget(effect.target);
      if (parsed && typeof effect.value === 'string') {
        const targets =
          parsed.pattern === 'all'
            ? Object.values(state.agents)
            : [state.agents[parsed.agentId as string]].filter(Boolean);
        for (const agent of targets) {
          if (!agent.constraintSet.hard) agent.constraintSet.hard = [];
          if (!agent.constraintSet.hard.includes(effect.value)) {
            agent.constraintSet.hard.push(effect.value);
          }
          if (!agent.constraints.includes(effect.value)) {
            agent.constraints.push(effect.value);
          }
        }
        applied.push(effect);
      }
      break;
    }
    case 'trigger_discourse': {
      const parsed = parseAgentIdTarget(effect.target);
      if (parsed && typeof effect.value === 'string') {
        const targetIds =
          parsed.pattern === 'all'
            ? Object.keys(state.agents)
            : [parsed.agentId as string].filter((id) => state.agents[id]);
        for (const id of targetIds) {
          if (!state.discourseHints[id]) state.discourseHints[id] = [];
          state.discourseHints[id].push(effect.value);
        }
        applied.push(effect);
      }
      break;
    }
    case 'enable_action':
    case 'disable_action': {
      // 动作注册表尚未实现，仅记录规则命中，便于后续扩展
      applied.push(effect);
      break;
    }
    default:
      break;
  }

  return applied;
}

/**
 * 对全部启用规则执行一次求值。
 * - pre 阶段：应用偏好/资源/环境/关系/约束/话术类效果，跳过 modify_consensus
 * - post 阶段：仅应用 modify_consensus（在共识评估完成后回调）
 * 所有变更基于基线快照的深拷贝，跨轮次不会叠加。
 */
export function evaluateRules(
  rules: IfThenRule[] | undefined,
  baseline: RuleBaseline,
  gameState: RuleGameState,
  phase: RulePhase
): RuleEvaluationResult {
  const agents = deepClone(baseline.agents);
  const environment: EnvironmentConfig =
    deepClone(baseline.environment) ?? {
      political: { centralAuthority: 0.5, policySignalClarity: 0.5, supervisionIntensity: 0.5, politicalStability: 0.5 },
      economic: { fiscalPressure: 0.5, economicGrowth: 0.5, resourceAbundance: 0.5, marketMaturity: 0.5 },
      social: { publicAttention: 0.5, opinionPressure: 0.5, interestGroupActivity: 0.5, socialStability: 0.5 },
      institutional: { regulationCompleteness: 0.5, accountabilityStrength: 0.5, informationTransparency: 0.5, coordinationMaturity: 0.5 },
    };
  const relationships: AgentRelationship[] = deepClone(baseline.relationships?.relationships ?? []);
  const logs: RuleEvaluationLog[] = [];
  const discourseHints: Record<string, string[]> = {};
  const consensusAppliedRules = new Set<string>();
  let consensusDelta = 0;

  const enabledRules = (rules ?? [])
    .filter((r) => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of enabledRules) {
    for (const agent of Object.values(agents)) {
      const conditionDetails = rule.conditions.map((condition) => {
        const actual = resolveConditionValue(condition, agent, environment, relationships, gameState);
        const result = evaluateCondition(condition, actual);
        return {
          path: condition.metricPath,
          actualValue: result.actualValue,
          operator: condition.operator,
          threshold: result.threshold,
          met: result.met,
        };
      });

      const conditionsMet = conditionDetails.length === 0 || conditionDetails.every((c) => c.met);
      if (!conditionsMet) continue;

      const effectsApplied: RuleEffect[] = [];
      const state = { agents, environment, relationships, consensusDelta, discourseHints, consensusAppliedRules };
      for (const effect of rule.effects) {
        effectsApplied.push(...applyEffect(effect, agent.id, phase, rule.id, state));
      }
      consensusDelta = state.consensusDelta;

      if (effectsApplied.length > 0) {
        logs.push({
          timestamp: Date.now(),
          round: gameState.round,
          agentId: agent.id,
          ruleId: rule.id,
          ruleName: rule.name,
          conditionsMet: true,
          conditionDetails,
          effectsApplied,
        });
      }
    }
  }

  return { logs, agents, environment, relationships, consensusDelta, discourseHints };
}
