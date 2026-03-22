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

// ─── System Prompt ───────────────────────────────────────────
const SYSTEM_PROMPT = `你是海龟汤裁判。严格遵守以下规则：

- status 只能是 YES / NO / IRRELEVANT / SOLVED 之一
- message 严禁超过5个字（如"是""不是""无关"），唯一例外：status 为 SOLVED 时可以写稍长的祝贺语
- reasoning 用最短语句记录判断依据
- 只有玩家说出真相核心逻辑才判 SOLVED
- 绝不透露真相

严格以如下 JSON 回复，不要输出任何其他内容：
{"status":"YES|NO|IRRELEVANT|SOLVED","message":"是/不是/无关/答对了","reasoning":"极简判断依据"}`;

// ─── Route Handler ───────────────────────────────────────────
export async function POST(request: Request) {
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

    // 5. Parse & validate AI response
    const raw = completion.choices[0]?.message.content;
    if (!raw) {
      return NextResponse.json({ error: "AI 返回结果为空" }, { status: 502 });
    }

    const jsonParsed = AIResponseSchema.safeParse(JSON.parse(raw));
    if (!jsonParsed.success) {
      console.error("[judge] AI response validation failed:", jsonParsed.error.flatten());
      return NextResponse.json({ error: "AI 返回格式异常" }, { status: 502 });
    }

    const result: AIResponse = jsonParsed.data;
    const { reasoning: _reasoning, ...clientPayload } = result;

    return NextResponse.json(clientPayload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知服务端错误";
    console.error("[judge] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
