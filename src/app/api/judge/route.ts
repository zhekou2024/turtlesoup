import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  AIResponseSchema,
  JudgeRequestSchema,
  type AIResponse,
} from "@/types/game";
import { getStoryById } from "@/lib/stories"; // 强制从新数据源拉取案卷

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});

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

if (typeof globalThis !== "undefined") {
  const PURGE_INTERVAL = 5 * 60_000;
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipHits) {
      if (now - entry.timestamp > RATE_WINDOW_MS) ipHits.delete(ip);
    }
  }, PURGE_INTERVAL).unref?.();
}

const SYSTEM_PROMPT = `<system_role>你是系统底层的物理法则判定内核。绝对理性，没有任何人类共情。</system_role>

<checklist_protocol>
  在处理每个问题前，你必须先将汤底拆解为 3-4 个不可再分的核心要素（Key Elements）。
  示例拆解——经典海龟汤：
    A. 当年吃的是人肉（不是海龟肉）
    B. 曾遭遇海难/困境流落荒岛
    C. 同伴欺骗他说那是海龟汤
    D. 今日尝到真正海龟汤后发现真相，绝望自杀
  你必须对每个故事执行同等粒度的拆解，并在 reasoning 中追踪进度。
</checklist_protocol>

<rules>
  1. 你的输出只能是 JSON 格式。
  2. <status_enum>
      status 是系统控制符，绝对不允许填入 YES、NO、IRRELEVANT 或任何其他值。
      status 的值必须且只能是以下两者之一：
        - "IN_PROGRESS"：游戏仍在进行中（无论玩家猜对、猜错还是问了无关问题）
        - "SOLVED"：仅当玩家 100% 猜中全部核心要素时才可使用
     </status_enum>
  3. <message_field>
      玩家问题的「是/否/无关」判定结果，只能放在 message 字段中。
      示例：玩家猜对了 → message: "是"；猜错了 → message: "不是"；问题无关 → message: "无关"
     </message_field>
  4. <definition_SOLVED>
      绝对禁止返回 SOLVED，除非玩家的历史提问加上当前提问已经明确覆盖了全部核心要素。
      如果玩家只猜出部分要素（哪怕猜出了最关键的一个），必须返回 IN_PROGRESS，message 写"是"，继续引导。
      只有当最后一个未覆盖的要素也被命中时，才可返回 SOLVED。
     </definition_SOLVED>
  5. <message_constraint>message 字段不超过 10 个字，中立极简。</message_constraint>
  6. <secrecy>绝不透露汤底中的任何具体信息，不可主动散发线索。</secrecy>
</rules>

<output_format>
  {"status": "IN_PROGRESS 或 SOLVED", "message": "是/不是/无关/破案了", "reasoning": "[清单核对] A.已命中/未命中 B.… C.… D.… | 判定依据：…"}
</output_format>

<few_shot_examples>
  <example>
    <context>经典海龟汤，玩家猜对了一个要素</context>
    <user>他吃的其实是人肉对吗？</user>
    <assistant>{"status": "IN_PROGRESS", "message": "是", "reasoning": "[清单核对] A.已命中 B.未命中 C.未命中 D.未命中 | 玩家命中A，BCD未触及，禁止SOLVED"}</assistant>
  </example>
  <example>
    <context>经典海龟汤，玩家猜错了</context>
    <user>他是被下毒了吗？</user>
    <assistant>{"status": "IN_PROGRESS", "message": "不是", "reasoning": "[清单核对] A.未命中 B.未命中 C.未命中 D.未命中 | 下毒与真相无关"}</assistant>
  </example>
  <example>
    <context>经典海龟汤，玩家问了无关问题</context>
    <user>那天天气好吗？</user>
    <assistant>{"status": "IN_PROGRESS", "message": "无关", "reasoning": "[清单核对] 无变化 | 天气与核心真相无因果关系"}</assistant>
  </example>
  <example>
    <context>经典海龟汤，历史已覆盖 A/B/C，本轮命中 D</context>
    <user>他意识到真相后无法承受才自杀的？</user>
    <assistant>{"status": "SOLVED", "message": "破案了", "reasoning": "[清单核对] A.已命中 B.已命中 C.已命中 D.已命中 | 全部要素覆盖，判定SOLVED"}</assistant>
  </example>
</few_shot_examples>`;

function withTiming(res: NextResponse, timings: Record<string, number>): NextResponse {
  const value = Object.entries(timings)
    .map(([name, dur]) => `${name};dur=${dur.toFixed(1)}`)
    .join(", ");
  res.headers.set("Server-Timing", value);
  return res;
}

export async function POST(request: Request) {
  const t0 = performance.now();

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("[FATAL] DEEPSEEK_API_KEY missing");
    return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "发送太频繁，请稍后再试" }, { status: 429 });
  }

  const tGuard = performance.now();

  try {
    const body: unknown = await request.json();
    const parsed = JudgeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "参数校验失败" }, { status: 400 });
    }

    const { puzzleId, question, history } = parsed.data;

    // 核心修复点
    const story = getStoryById(puzzleId);
    if (!story) {
      return NextResponse.json({ error: "谜题不存在" }, { status: 404 });
    }

    const historyText = history
      .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: [${h.answer.status}] ${h.answer.message}`)
      .join("\n\n");

    const userMessage = [
      `【汤面】${story.surface}`,
      `【真相（仅裁判可见）】${story.bottom}`,
      historyText ? `【历史对话】\n${historyText}` : "",
      `【玩家新提问】${question}`,
    ].filter(Boolean).join("\n\n");

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

    const rawText = completion.choices[0]?.message.content;
    if (!rawText) {
      return NextResponse.json({ error: "AI 返回结果为空" }, { status: 502 });
    }

    const cleanText = rawText.replace(/```json\n?|```/g, "").trim();

    let parsed_json: unknown;
    try {
      parsed_json = JSON.parse(cleanText);
    } catch (e) {
      return NextResponse.json({ status: "IN_PROGRESS", message: "系统算力紊乱，请重试。" });
    }

    const jsonParsed = AIResponseSchema.safeParse(parsed_json);
    if (!jsonParsed.success) {
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