// ============================================================
// 模拟引擎 — 编排多智能体博弈流程
// ============================================================

import { callDeepSeek } from './llm';
import {
  buildSystemPrompt,
  buildRoundPrompt,
  buildConsensusPrompt,
} from './prompt-builder';
import type {
  ScenarioConfig,
  SimulationSession,
  SimulationEvent,
  SimulationState,
  AgentState,
  AgentConfig,
  DiscourseAction,
  ArenaOutput,
  NegotiationRound,
  ThinkingStep,
  ThinkingHistory,
  DecisionTrace,
} from './types';

/** 创建模拟会话 */
export function createSession(scenario: ScenarioConfig): SimulationSession {
  const agentStates: Record<string, AgentState> = {};
  for (const agent of scenario.agents) {
    agentStates[agent.id] = {
      config: agent,
      currentStance: '',
      hiddenStrategy: '',
      concessionHistory: [],
      trustMap: Object.fromEntries(
        scenario.agents
          .filter((a) => a.id !== agent.id)
          .map((a) => [a.id, 0.5])
      ),
    };
  }

  // 初始化关系信任度
  if (scenario.relationships?.relationships) {
    for (const rel of scenario.relationships.relationships) {
      if (agentStates[rel.from]) {
        agentStates[rel.from].trustMap[rel.to] = rel.trust;
      }
    }
  }

  return {
    id: `sim_${Date.now()}`,
    scenario,
    status: 'idle',
    currentRound: 0,
    currentArena: scenario.protocol.rounds[0]?.arenaType ?? 'bureaucratic_bargaining',
    agentStates,
    history: [],
    finalOutcome: null,
    createdAt: Date.now(),
  };
}

/**
 * 解析 Agent 输出 — 从【场面话】+【潜台词】格式中提取
 */
function parseAgentOutput(text: string): {
  visible_text: string;
  hidden_strategy: string;
} {
  // 尝试解析【场面话】和【潜台词】格式
  const visibleMatch = text.match(/【场面话】\s*([\s\S]*?)(?=【潜台词】|$)/);
  const hiddenMatch = text.match(/【潜台词】\s*([\s\S]*?)$/);

  if (visibleMatch && hiddenMatch) {
    return {
      visible_text: visibleMatch[1].trim(),
      hidden_strategy: hiddenMatch[1].trim(),
    };
  }

  // fallback: 尝试 JSON 格式
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      visible_text: parsed.visible_text ?? parsed.visibleText ?? '',
      hidden_strategy: parsed.hidden_strategy ?? parsed.hiddenStrategy ?? '',
    };
  } catch {
    // 最终 fallback: 整段作为 visible_text
    return {
      visible_text: text.slice(0, 300),
      hidden_strategy: '（策略分析未能解析）',
    };
  }
}

/** 解析共识评估输出 */
function parseConsensusOutput(text: string): {
  consensus_level: number;
  summary: string;
  key_decisions: string[];
  tension_points?: string[];
} {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      consensus_level: parsed.score ?? parsed.consensus_level ?? 0.5,
      summary: parsed.summary ?? '',
      key_decisions: parsed.key_decisions ?? [],
      tension_points: parsed.tension_points ?? [],
    };
  } catch {
    return {
      consensus_level: 0.5,
      summary: '共识评估解析失败',
      key_decisions: [],
    };
  }
}

/** 构建历史上下文摘要 — 供下一位 Agent 参考 */
function buildHistoryContext(
  allPreviousActions: DiscourseAction[],
  roundActions: DiscourseAction[],
): string {
  const all = [...allPreviousActions, ...roundActions];
  if (all.length === 0) return '';

  const lines: string[] = ['\n--- 前面的发言（仅场面话摘要）---'];
  for (const h of all) {
    const snippet = h.visibleText.substring(0, 100);
    lines.push(`[${h.agentName}]：${snippet}${h.visibleText.length > 100 ? '...' : ''}`);
  }
  return lines.join('\n');
}

/** 执行单轮博弈 */
async function executeRound(
  session: SimulationSession,
  round: NegotiationRound,
  allPreviousActions: DiscourseAction[],
  onEvent: (event: SimulationEvent) => void
): Promise<ArenaOutput> {
  const roundActions: DiscourseAction[] = [];

  onEvent({
    type: 'round_start',
    round: round.id,
    arena: round.arenaType,
    data: { roundName: round.name, description: round.description },
    timestamp: Date.now(),
  });

  // 按发言顺序让每个 Agent 发言
  console.log(`[引擎] 轮次${round.id}发言顺序:`, round.speakingOrder);
  for (const agentId of round.speakingOrder) {
    const agentState = session.agentStates[agentId];
    console.log(`[引擎] 处理Agent: ${agentId}, 状态:`, agentState ? '存在' : '未找到');
    if (!agentState) {
      console.log(`[引擎] 跳过Agent ${agentId}，因为状态不存在`);
      continue;
    }

    const systemPrompt = buildSystemPrompt(agentState.config);

    // 构建模拟状态供 prompt-builder 使用
    const simState: SimulationState = {
      scenario: session.scenario,
      currentRound: round.id,
      currentArena: round.arenaType,
      agentStates: session.agentStates,
      interactionHistory: [...allPreviousActions, ...roundActions],
      institutionalMemory: [],
    };

    const roundPrompt = buildRoundPrompt(agentState.config, round, simState);
    const historyContext = buildHistoryContext(allPreviousActions, roundActions);
    const userPrompt = roundPrompt + historyContext;

    // 使用Agent自己的API配置，如果没有则使用默认配置
    const apiConfig = agentState.config.apiConfig;

    // 记录思考步骤
    const thinkingSteps: ThinkingStep[] = [
      {
        phase: 'analysis',
        content: `分析当前局势：${round.name}。${round.description}`,
        timestamp: Date.now(),
        factors: [round.arenaType, `轮次${round.id + 1}`],
        confidence: 0.8,
      },
      {
        phase: 'strategy',
        content: `基于自身立场（${agentState.config.role}）制定策略。考虑偏好权重和硬约束。`,
        timestamp: Date.now(),
        factors: ['偏好权重', '硬约束', '资源禀赋'],
        confidence: 0.75,
      },
    ];

    // 如果有API配置，记录配置信息
    if (apiConfig) {
      thinkingSteps.push({
        phase: 'output',
        content: `使用模型: ${apiConfig.model}，温度: ${apiConfig.temperature}`,
        timestamp: Date.now(),
        factors: ['API配置'],
      });
    }

    // 将思考步骤存储到agentState中（供前端读取）
    if (!agentState.thinkingHistory) {
      agentState.thinkingHistory = [];
    }
    agentState.thinkingHistory.push({ round: round.id, steps: thinkingSteps });

    onEvent({
      type: 'agent_thinking',
      round: round.id,
      arena: round.arenaType,
      data: { agentId, agentName: agentState.config.name, thinkingSteps },
      timestamp: Date.now(),
    });

    try {
      // 记录API调用信息
      const apiKeyInfo = apiConfig?.apiKey ? `${apiConfig.apiKey.substring(0, 10)}...` : '未设置';
      console.log(`[引擎] Agent ${agentState.config.name} 调用API: apiKey=${apiKeyInfo}, baseUrl=${apiConfig?.baseUrl || '默认'}, model=${apiConfig?.model || '默认'}`);
      
      const response = await callDeepSeek(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { 
          temperature: apiConfig?.temperature ?? 0.7, 
          maxTokens: apiConfig?.maxTokens ?? 800,
          apiKey: apiConfig?.apiKey,
          baseUrl: apiConfig?.baseUrl,
          model: apiConfig?.model
        }
      );

      const parsed = parseAgentOutput(response.content);

      const action: DiscourseAction = {
        agentId,
        agentName: agentState.config.name,
        arenaType: round.arenaType,
        round: round.id,
        visibleText: parsed.visible_text,
        hiddenStrategy: parsed.hidden_strategy,
        timestamp: Date.now(),
      };

      roundActions.push(action);

      // 更新 Agent 状态
      agentState.currentStance = parsed.visible_text;
      agentState.hiddenStrategy = parsed.hidden_strategy;

      console.log(`[引擎] Agent ${agentState.config.name} API调用完成`);

      onEvent({
        type: 'agent_speaking',
        round: round.id,
        arena: round.arenaType,
        data: {
          agentId,
          agentName: agentState.config.name,
          visibleText: parsed.visible_text,
          hiddenStrategy: parsed.hidden_strategy,
        },
        timestamp: Date.now(),
      });
      console.log(`[引擎] Agent ${agentState.config.name} 发言事件已发送`);

      // 记录决策追溯
      if (!session.decisionTraces) {
        session.decisionTraces = [];
      }
      
      const decisionTrace: DecisionTrace = {
        id: `trace-${round.id}-${agentId}-${Date.now()}`,
        agentId,
        agentName: agentState.config.name,
        round: round.id,
        roundName: round.name,
        timestamp: Date.now(),
        thinkingSteps: thinkingSteps,
        inputContext: {
          systemPrompt: systemPrompt.substring(0, 500) + '...',
          userPrompt: userPrompt.substring(0, 500) + '...',
        },
        output: {
          visibleText: parsed.visible_text,
          hiddenStrategy: parsed.hidden_strategy,
          model: apiConfig?.model || 'deepseek-chat',
          parameters: {
            temperature: apiConfig?.temperature ?? 0.7,
            maxTokens: apiConfig?.maxTokens ?? 800,
          },
        },
        decisionRationale: `基于${thinkingSteps[0]?.content || '分析'}，采取${thinkingSteps[1]?.content || '策略'}，最终生成发言内容。`,
      };
      
      session.decisionTraces.push(decisionTrace);
      
      onEvent({
        type: 'decision_trace',
        round: round.id,
        arena: round.arenaType,
        data: decisionTrace as unknown as Record<string, unknown>,
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`[引擎] Agent ${agentState.config.name} 调用失败:`, errorMsg);
      onEvent({
        type: 'error',
        round: round.id,
        arena: round.arenaType,
        data: { agentId, error: errorMsg },
        timestamp: Date.now(),
      });

      roundActions.push({
        agentId,
        agentName: agentState.config.name,
        arenaType: round.arenaType,
        round: round.id,
        visibleText: `[系统错误：${errorMsg}]`,
        hiddenStrategy: 'LLM调用失败',
        timestamp: Date.now(),
      });
    }
  }

  // 本轮结束后进行共识评估
  const consensusEval = await evaluateConsensus(session, round, roundActions);

  // 生成本轮小结（核心争议点 + 达成共识）
  const roundSummary = await generateRoundSummary(session, round, roundActions, consensusEval);

  onEvent({
    type: 'round_end',
    round: round.id,
    arena: round.arenaType,
    data: {
      consensusLevel: consensusEval.consensus_level,
      summary: consensusEval.summary,
      keyDecisions: consensusEval.key_decisions,
    },
    timestamp: Date.now(),
  });

  // 推送轮次小结事件
  onEvent({
    type: 'round_summary',
    round: round.id,
    arena: round.arenaType,
    data: {
      roundName: round.name,
      roundDescription: round.description,
      disputes: roundSummary.disputes,
      consensus: roundSummary.consensus,
      indicatorInteractions: roundSummary.indicatorInteractions,
      ruleInfluences: roundSummary.ruleInfluences,
    },
    timestamp: Date.now(),
  });

  return {
    arenaType: round.arenaType,
    round: round.id,
    actions: roundActions,
    summary: consensusEval.summary,
    consensusLevel: consensusEval.consensus_level,
    keyDecisions: consensusEval.key_decisions,
  };
}

/** 评估本轮共识程度 */
async function evaluateConsensus(
  session: SimulationSession,
  round: NegotiationRound,
  actions: DiscourseAction[]
): Promise<{
  consensus_level: number;
  summary: string;
  key_decisions: string[];
  tension_points?: string[];
}> {
  if (actions.length === 0) {
    return { consensus_level: 0, summary: '本轮无发言', key_decisions: [] };
  }

  const simState: SimulationState = {
    scenario: session.scenario,
    currentRound: round.id,
    currentArena: round.arenaType,
    agentStates: session.agentStates,
    interactionHistory: actions,
    institutionalMemory: [],
  };

  const prompt = buildConsensusPrompt(simState, round);
  try {
    const response = await callDeepSeek(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 300 }
    );
    return parseConsensusOutput(response.content);
  } catch {
    return {
      consensus_level: 0.5,
      summary: '共识评估失败',
      key_decisions: [],
    };
  }
}

/** 生成轮次小结（核心争议点 + 达成共识 + 指标相互作用） */
async function generateRoundSummary(
  session: SimulationSession,
  round: NegotiationRound,
  actions: DiscourseAction[],
  consensusEval: { consensus_level: number; summary: string; key_decisions: string[]; tension_points?: string[] }
): Promise<{
  disputes: string[];
  consensus: string[];
  indicatorInteractions: string[];
  ruleInfluences: string[];
}> {
  if (actions.length === 0) {
    return { disputes: [], consensus: [], indicatorInteractions: [], ruleInfluences: [] };
  }

  // 构建摘要提示
  const agentNames = session.scenario.agents.map((a: AgentConfig) => a.name).join('、');
  const actionsText = actions.map((a: DiscourseAction) => {
    const agent = session.scenario.agents.find((ag: AgentConfig) => ag.id === a.agentId);
    return `【${agent?.name || a.agentId}】\n场面话：${a.visibleText}\n潜台词：${a.hiddenStrategy}`;
  }).join('\n\n');

  const prompt = `请分析本轮博弈「${round.name}」的情况，生成结构化小结。

本轮发言内容：
${actionsText}

共识评估：${consensusEval.summary}

请按以下JSON格式输出：
{
  "disputes": ["核心争议点1（涉及哪些Agent的哪些指标冲突）", "核心争议点2"],
  "consensus": ["达成的共识1", "达成的共识2"],
  "indicatorInteractions": ["指标A（Agent1）压制了指标B（Agent2），导致...", "指标C与指标D相互权衡，最终..."],
  "ruleInfluences": ["博弈规则X导致Agent1采取Y策略", "Agent2的Z约束使其无法同意..."]
}

要求：
1. disputes: 列出2-4个核心争议点，说明是哪些Agent之间的哪些指标在冲突
2. consensus: 列出1-3个达成的共识
3. indicatorInteractions: 说明哪些偏好指标在相互作用、谁压倒了谁
4. ruleInfluences: 说明博弈规则和Agent约束如何影响了决策`;

  try {
    const response = await callDeepSeek(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 500 }
    );
    // 尝试从响应中提取JSON
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { disputes: [], consensus: [] };
    return {
      disputes: parsed.disputes || [],
      consensus: parsed.consensus || [],
      indicatorInteractions: parsed.indicatorInteractions || [],
      ruleInfluences: parsed.ruleInfluences || [],
    };
  } catch {
    return {
      disputes: consensusEval.tension_points || [],
      consensus: consensusEval.key_decisions || [],
      indicatorInteractions: [],
      ruleInfluences: [],
    };
  }
}

/** 运行完整模拟（生成器模式，支持逐步推送事件） */
export async function* runSimulation(
  session: SimulationSession
): AsyncGenerator<SimulationEvent> {
  session.status = 'running';
  const allActions: DiscourseAction[] = [];

  for (const round of session.scenario.protocol.rounds) {
    session.currentRound = round.id;
    session.currentArena = round.arenaType;

    const output = await executeRound(session, round, allActions, (event) => {
      void event;
    });

    for (const action of output.actions) {
      allActions.push(action);
    }
    session.history.push(output);
  }

  session.status = 'completed';
  session.finalOutcome = generateFinalOutcome(session);

  yield {
    type: 'simulation_complete',
    round: session.scenario.protocol.rounds.length - 1,
    arena: session.currentArena,
    data: {
      outcome: session.finalOutcome,
      totalRounds: session.scenario.protocol.rounds.length,
    },
    timestamp: Date.now(),
  };
}

/** 生成最终结果 */
function generateFinalOutcome(session: SimulationSession) {
  const lastRound = session.history[session.history.length - 1];
  return {
    agreementType: 'consensus' as const,
    finalText: lastRound?.summary ?? '模拟完成',
    implementationTerms: [],
    monitoringMechanism: '',
    agentStates: Object.fromEntries(
      Object.entries(session.agentStates).map(([id, state]) => [
        id,
        {
          stance: state.currentStance,
          concessions: state.concessionHistory.map((c) => `让步度: ${c}`),
        },
      ])
    ),
  };
}

/**
 * 运行完整模拟（回调模式） — 供 API Route 使用
 * 每个事件通过 onEvent 回调推送给 SSE 流
 */
export async function runSimulationWithEvents(
  session: SimulationSession,
  onEvent: (event: SimulationEvent) => void
): Promise<void> {
  session.status = 'running';
  const allActions: DiscourseAction[] = [];

  for (const round of session.scenario.protocol.rounds) {
    session.currentRound = round.id;
    session.currentArena = round.arenaType;

    const output = await executeRound(session, round, allActions, onEvent);

    for (const action of output.actions) {
      allActions.push(action);
    }
    session.history.push(output);
  }

  session.status = 'completed';
  session.finalOutcome = generateFinalOutcome(session);

  onEvent({
    type: 'simulation_complete',
    round: session.scenario.protocol.rounds.length - 1,
    arena: session.currentArena,
    data: {
      outcome: session.finalOutcome,
      totalRounds: session.scenario.protocol.rounds.length,
    },
    timestamp: Date.now(),
  });
}
