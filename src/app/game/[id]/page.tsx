import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoryById } from "@/lib/stories";
import { GameBoard } from "@/components/game-board";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = getStoryById(id);

  if (!story) notFound();

  return (
    <main className="mx-auto flex min-h-[100dvh] max-h-[100dvh] max-w-2xl flex-col
                      overflow-hidden bg-black px-5 py-6 font-mono text-green-500 sm:px-8">
      {/* Nav */}
      <Link
        href="/"
        className="shrink-0 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
      >
        {"<"} EXIT_TO_LOBBY
      </Link>

      {/* Header */}
      <div className="mt-4 shrink-0 border-b border-zinc-800 pb-3">
        <p className="text-xs text-zinc-600">CASE_FILE: {story.id}</p>
        <h1 className="mt-1 text-lg font-bold tracking-tight text-green-400">
          {story.title}
        </h1>
      </div>

      {/* Surface story (classified dossier) */}
      <div className="mt-4 shrink-0 border border-zinc-800 p-4">
        <p className="text-xs text-zinc-600">--- SURFACE_STORY [DECLASSIFIED] ---</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          {story.surface}
        </p>
        <p className="mt-3 text-xs text-zinc-700">--- END_OF_BRIEFING ---</p>
      </div>

      {/* Game engine — flex-1 fills remaining viewport */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <GameBoard puzzleId={story.id} bottomText={story.bottom} />
      </div>
    </main>
  );
}
