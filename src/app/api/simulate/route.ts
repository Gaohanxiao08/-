// ============================================================
// API Route: /api/simulate — SSE 流式推送模拟过程
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSession, runSimulationWithEvents } from '@/lib/simulation/engine';
import { scenarioRegistry } from '@/lib/simulation/scenarios';
import type { SimulationEvent, SimulationSession, AgentConfig, EnvironmentConfig, RelationshipNetwork, IfThenRule } from '@/lib/simulation/types';

function handleSimulation(session: SimulationSession, scenarioId: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      
      const sendEvent = (event: SimulationEvent) => {
        if (isClosed) return;
        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (e) {
          console.error('[API] 发送事件失败:', e);
          isClosed = true;
        }
      };

      try {
        await runSimulationWithEvents(session, sendEvent);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[API] 模拟运行失败:', errorMsg);
        sendEvent({
          type: 'error',
          round: session.currentRound,
          arena: session.currentArena,
          data: { error: errorMsg },
          timestamp: Date.now(),
        });
      }

      if (!isClosed) {
        try {
          controller.close();
          isClosed = true;
        } catch (e) {
          console.error('[API] 关闭流失败:', e);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const scenarioId = body.scenario ?? 'healthcare_reform';
    // 支持前端发送 customAgents 数组或 agentConfigs 对象
    const customAgentsArray = body.customAgents as AgentConfig[] | undefined;
    const customAgentConfigsObj = body.agentConfigs as Record<string, Partial<AgentConfig>> | undefined;
    const customEnvironment = body.environment as Partial<EnvironmentConfig> | undefined;
    const customRelationships = body.relationships as RelationshipNetwork | undefined;
    const customRules = body.rules as IfThenRule[] | undefined;

    const scenario = scenarioRegistry[scenarioId];
    if (!scenario) {
      return NextResponse.json(
        { error: `Unknown scenario: ${scenarioId}` },
        { status: 400 }
      );
    }

    // 合并环境配置
    const defaultEnv = scenario.environment;
    const environment: EnvironmentConfig | undefined = customEnvironment && defaultEnv
      ? {
          political: Object.assign({}, defaultEnv.political, customEnvironment.political),
          economic: Object.assign({}, defaultEnv.economic, customEnvironment.economic),
          social: Object.assign({}, defaultEnv.social, customEnvironment.social),
          institutional: Object.assign({}, defaultEnv.institutional, customEnvironment.institutional),
        }
      : scenario.environment;

    // 合并关系配置
    const relationships = customRelationships ?? scenario.relationships;
    const rules = Array.isArray(customRules) ? customRules : scenario.rules;

    // 如果有自定义Agent配置，合并到场景中
    // 优先使用 customAgentsArray（前端发送的完整Agent数组）
    let finalAgents = scenario.agents;
    if (customAgentsArray && customAgentsArray.length > 0) {
      // 记录接收到的Agent信息
      console.log(`[API] 接收到 ${customAgentsArray.length} 个自定义Agent`);
      customAgentsArray.forEach((agent, idx) => {
        const apiKeyStatus = agent.apiConfig?.apiKey ? `${agent.apiConfig.apiKey.substring(0, 10)}...` : '未设置';
        console.log(`[API] Agent ${idx}: ${agent.name || agent.id}, apiKey=${apiKeyStatus}, model=${agent.apiConfig?.model || '默认'}`);
      });
      
      finalAgents = customAgentsArray.map((agent) => ({
        ...agent,
        // 确保 apiConfig 被正确传递
        apiConfig: agent.apiConfig ?? {
          provider: 'deepseek',
          apiKey: '',
          baseUrl: '',
          model: 'deepseek-chat',
          temperature: 0.7,
          maxTokens: 2000,
          topP: 0.9,
          enableThinkingTrace: true,
          thinkingTrace: [],
        },
      }));
    } else if (customAgentConfigsObj) {
      // 兼容旧的 agentConfigs 对象格式
      const mergedAgents = scenario.agents.map((agent) => {
        const custom = customAgentConfigsObj[agent.id];
        if (!custom) return agent;
        return {
          ...agent,
          name: custom.name ?? agent.name,
          role: custom.role ?? agent.role,
          preferences: custom.preferences ?? agent.preferences,
          resources: custom.resources ?? agent.resources,
          constraints: custom.constraints ?? agent.constraints,
          incentives: custom.incentives ?? agent.incentives,
          responsibilities: custom.responsibilities ?? agent.responsibilities,
          position: custom.position ?? agent.position,
          discourseStyle: agent.discourseStyle,
        };
      });

      // 添加新增的Agent（不在原始场景中的）
      const originalIds = new Set(scenario.agents.map((a) => a.id));
      for (const [id, custom] of Object.entries(customAgentConfigsObj)) {
        if (!originalIds.has(id) && custom.name) {
          mergedAgents.push({
            id,
            name: custom.name,
            role: custom.role ?? '自定义角色',
            level: (custom.position?.level ?? 'central') as AgentConfig['level'],
            preferences: custom.preferences ?? { '政策目标': 0.5 },
            resources: custom.resources ?? {
              politicalCapital: 0.5,
              administrativeCapacity: 0.5,
              informationAdvantage: 0.5,
              legalAuthority: 0.5,
            },
            constraints: custom.constraints ?? [],
            incentives: custom.incentives ?? [
              { type: 'promotion', intensity: 0.5, source: '考核体系' },
              { type: 'fiscal', intensity: 0.5, source: '财政拨款' },
              { type: 'political', intensity: 0.5, source: '政治信号' },
            ],
            responsibilities: custom.responsibilities ?? {
              coreMandate: '自定义职能',
              actionGoals: [],
              informalPractices: [],
            },
            position: custom.position ?? {
              level: 'central',
              powerType: 'functional',
              jurisdiction: [],
              vetoPower: false,
              rank: 3,
            },
            power: {
              agendaSetting: 0.5,
              veto: 0.0,
              resourceAllocation: 0.5,
              informationControl: 0.5,
              personnelMobility: 0.3,
              enforcement: 0.5,
              personnel: 0.5,
            },
            discourseStyle: {
              formalityLevel: 0.7,
              deferenceToSuperior: 0.5,
              ambiguityPreference: 0.5,
              consensusSeeking: 0.6,
              conflictAvoidance: 0.6,
              technicalVocabulary: 0.5,
              partyLanguageUsage: 0.5,
              localInterestEmphasis: 0.3,
              nationalAlignment: 0.7,
            },
            constraintSet: {
              centralConstraints: [],
              fiscalConstraints: [],
              institutionalConstraints: [],
              socialConstraints: [],
            },
          });
        }
      }
      finalAgents = mergedAgents;
    }

    const modifiedScenario = {
      ...scenario,
      agents: finalAgents,
      environment,
      relationships,
      protocol: {
        ...scenario.protocol,
        rounds: scenario.protocol.rounds.map((round) => ({
          ...round,
          speakingOrder: round.speakingOrder.filter((agentId) =>
            finalAgents.some((a) => a.id === agentId)
          ),
        })),
      },
      rules,
    };
    const session = createSession(modifiedScenario);
    return handleSimulation(session, scenarioId);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to start simulation: ${errorMsg}` },
      { status: 500 }
    );
  }
}

/** GET: 获取可用场景列表 */
export async function GET() {
  const scenarios = Object.values(scenarioRegistry).map((s) => ({
    id: s.id,
    title: s.title,
    domain: s.domain,
    description: s.description,
    agentCount: s.agents.length,
    roundCount: s.protocol.rounds.length,
    agents: s.agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      level: a.level,
    })),
  }));

  return NextResponse.json({ scenarios });
}
