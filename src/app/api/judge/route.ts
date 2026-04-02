import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  AIResponseSchema,
  JudgeRequestSchema,
  type AIResponse,
} from "@/types/game";
import { getPuzzleById } from "@/data/puzzles";

// ─── DeepSeek Client ─────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// ─── In-Memory IP Rate Limiter ───────────────────────────────
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_HITS = 15;

const ipHits = new Map<string, { count: number; timestamp: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now - entry.timestamp > RATE_WINDOW_MS) {
    ipHits.set(ip, { count: 1, timestamp: now });
    return false;
  }

  entry.count++;
  return entry.count > RATE_MAX_HITS;
}

// Periodically purge stale entries to prevent memory leak in long-lived instances
if (typeof globalThis !== "undefined") {
  const PURGE_INTERVAL = 5 * 60_000;
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipHits) {
      if (now - entry.timestamp > RATE_WINDOW_MS) ipHits.delete(ip);
    }
  }, PURGE_INTERVAL).unref?.();
}

// ─── System Prompt (XML-Tagged High-Density) ────────────────
const SYSTEM_PROMPT = `<system_role>你是系统底层的物理法则判定内核。绝对理性，没有任何人类共情。</system_role>
<rules>
  1. 你的输出只能是 JSON 格式。
  2. <status_enum>枚举值严格锁定为：["YES", "NO", "IRRELEVANT", "SOLVED"]。</status_enum>
  3. <definition_IRRELEVANT>当问题与汤底的物理真相、核心动机或关键人物毫无逻辑因果关系时，强制返回 IRRELEVANT。绝不能主动顺着玩家的无关问题散发线索。</definition_IRRELEVANT>
  4. <definition_SOLVED>当且仅当玩家的提问准确点破了最核心的诡计、手法或最终真相时，返回 SOLVED。</definition_SOLVED>
  5. <message_constraint>message 字段不超过 10 个字，中立极简。</message_constraint>
  6. <secrecy>绝不透露汤底中的任何具体信息。</secrecy>
</rules>
<output_format>
  {"status": "枚举值", "message": "10字以内的极简中立回答", "reasoning": "仅供系统内部校验的推理过程"}
</output_format>
<few_shot_examples>
  <example>
    <user>他吃的是企鹅肉吗？</user>
    <assistant>{"status": "YES", "message": "是", "reasoning": "玩家命中了核心食材线索"}</assistant>
  </example>
  <example>
    <user>天气好吗？</user>
    <assistant>{"status": "IRRELEVANT", "message": "无关", "reasoning": "天气与核心真相无因果关系"}</assistant>
  </example>
</few_shot_examples>`;

// ─── Server-Timing Helper ────────────────────────────────────
function withTiming(res: NextResponse, timings: Record<string, number>): NextResponse {
  const value = Object.entries(timings)
    .map(([name, dur]) => `${name};dur=${dur.toFixed(1)}`)
    .join(", ");
  res.headers.set("Server-Timing", value);
  return res;
}

// ─── Route Handler ───────────────────────────────────────────
export async function POST(request: Request) {
  const t0 = performance.now();

  // 0. Env fail-fast
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("[FATAL] DEEPSEEK_API_KEY is not set in environment variables.");
    return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
  }

  // 1. IP rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "发送太频繁，请稍后再试" },
      { status: 429 }
    );
  }

  const tGuard = performance.now();

  try {
    // 2. Payload sanitization (fail-fast on malformed input)
    const body: unknown = await request.json();
    const parsed = JudgeRequestSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? "参数校验失败";
      return NextResponse.json({ error: firstIssue }, { status: 400 });
    }

    const { puzzleId, question, history } = parsed.data;

    // 3. Puzzle lookup
    const puzzle = getPuzzleById(puzzleId);
    if (!puzzle) {
      return NextResponse.json({ error: "谜题不存在" }, { status: 404 });
    }

    // 4. Build prompt & call DeepSeek
    const historyText = history
      .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: [${h.answer.status}] ${h.answer.message}`)
      .join("\n\n");

    const userMessage = [
      `【汤面】${puzzle.surfaceStory}`,
      `【真相（仅裁判可见）】${puzzle.truthBase}`,
      historyText ? `【历史对话】\n${historyText}` : "",
      `【玩家新提问】${question}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const tLlmStart = performance.now();

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 300,
    });

    const tLlmEnd = performance.now();

    // 5. Physical sanitization & parse AI response
    const rawText = completion.choices[0]?.message.content;
    if (!rawText) {
      return NextResponse.json({ error: "AI 返回结果为空" }, { status: 502 });
    }

    const cleanText = rawText.replace(/```json\n?|```/g, "").trim();

    let parsed_json: unknown;
    try {
      parsed_json = JSON.parse(cleanText);
    } catch (e) {
      console.error(JSON.stringify({
        event: "JSON_PARSE_FATAL",
        rawText,
        error: e instanceof Error ? e.message : "unknown",
      }));
      return NextResponse.json(
        { status: "IRRELEVANT", message: "系统算力紊乱，请重构你的指令。" }
      );
    }

    const jsonParsed = AIResponseSchema.safeParse(parsed_json);
    if (!jsonParsed.success) {
      console.error(JSON.stringify({
        event: "ZOD_VALIDATION_FATAL",
        parsed_json,
        issues: jsonParsed.error.flatten(),
      }));
      return NextResponse.json({ error: "AI 返回格式异常" }, { status: 502 });
    }

    const result: AIResponse = jsonParsed.data;
    const { reasoning: _reasoning, ...clientPayload } = result;

    return withTiming(NextResponse.json(clientPayload), {
      guard: tGuard - t0,
      llm: tLlmEnd - tLlmStart,
      total: performance.now() - t0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知服务端错误";
    console.error("[judge] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
