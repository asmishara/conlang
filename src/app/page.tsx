import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Build your own language</h1>
      <p className="max-w-prose text-lg opacity-80">
        Design a sound system, grow a dictionary, generate words that fit your
        phonology, and document your grammar, all in one place.
      </p>
      <Link
        href="/languages"
        className="inline-block rounded-md bg-foreground px-4 py-2 text-background"
      >
        Start a language
      </Link>
    </section>
  );
}
