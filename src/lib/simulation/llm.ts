// ============================================================
// DeepSeek LLM 客户端
// ============================================================

const DEFAULT_DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  /** DeepSeek-R1 等推理模型的思考链（reasoning_content），普通对话模型可能为空 */
  reasoning?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function callDeepSeek(
  messages: ChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  } = {}
): Promise<LLMResponse> {
  const { temperature = 0.7, maxTokens = 2048, signal, apiKey: customApiKey, baseUrl, model = 'deepseek-chat' } = options;
  // 优先使用Agent自己的API密钥，否则使用环境变量
  const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set and no custom API key provided');
  }

  const apiUrl = baseUrl || DEFAULT_DEEPSEEK_API_URL;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DeepSeek API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content ?? '',
    reasoning: choice?.message?.reasoning_content ?? undefined,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/** 流式调用 DeepSeek */
export async function callDeepSeekStream(
  messages: ChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  } = {}
): Promise<ReadableStream<string>> {
  const { temperature = 0.7, maxTokens = 2048, signal, apiKey: customApiKey, baseUrl, model = 'deepseek-chat' } = options;
  const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set and no custom API key provided');
  }

  const apiUrl = baseUrl || DEFAULT_DEEPSEEK_API_URL;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DeepSeek API error (${response.status}): ${errorText}`
    );
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async pull(controller) {
      if (!reader) {
        controller.close();
        return;
      }
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            controller.close();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(content);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    },
  });
}
