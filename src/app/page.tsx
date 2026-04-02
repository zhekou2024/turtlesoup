import { stories } from "@/lib/stories";
import { GameCard } from "@/components/GameCard";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl">
          AI 海龟汤
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-zinc-500">
          每个故事背后都藏着一个不为人知的真相。
          <br />
          向 AI 裁判提问，用「是」或「否」拼凑出完整的答案。
        </p>
      </header>

      {/* Card Grid */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <GameCard key={story.id} story={story} />
        ))}
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center text-xs text-zinc-600">
        AI 裁判由 DeepSeek 驱动
      </footer>
    </main>
  );
}
