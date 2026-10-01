import { redirect } from "next/navigation";
import { auth, providerList, signIn } from "@/auth";

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  // Only allow same-site relative redirects.
  const redirectTo =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/languages";

  if (session?.user) redirect(redirectTo);

  return (
    <section className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {providerList.length === 0 ? (
        <p className="text-sm opacity-80">
          No sign-in providers are configured. Set AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
          or AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (see README).
        </p>
      ) : (
        providerList.map((provider) => (
          <form
            key={provider.id}
            action={async () => {
              "use server";
              await signIn(provider.id, { redirectTo });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-md border border-black/15 px-4 py-2 dark:border-white/20"
            >
              Continue with {provider.name}
            </button>
          </form>
        ))
      )}
    </section>
  );
}
