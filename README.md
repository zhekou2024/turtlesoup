# 🐢 海龟汤 (Turtle Soup)

极简海龟汤情境猜谜游戏。玩家通过是非题逐步探索谜题背后的真相，AI 担任裁判。

## 技术栈

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS v4**
- **OpenAI GPT-4o-mini** + Structured Outputs (`zodResponseFormat`)
- **Zod** 强类型校验

## 架构

```
src/
├── types/game.ts           # 领域模型 + Zod Schema
├── data/puzzles.ts         # 谜题库
├── lib/use-game-machine.ts # 状态机 Hook (IDLE → THINKING → ANSWERED → SOLVED)
├── app/api/judge/route.ts  # AI 裁判 Serverless Function
├── components/             # UI 层 (纯渲染)
└── app/page.tsx            # 页面组装
```

## 启动

```bash
# 1. 安装依赖
npm install

# 2. 配置 OpenAI API Key
#    编辑 .env.local，将 sk-your-key-here 替换为真实 Key
echo "OPENAI_API_KEY=" > .env.local

# 3. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可开始游戏。
