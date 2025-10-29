export default async function ErrorPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;

  const message =
    (typeof searchParams?.message === "string" && searchParams.message) ||
    "Sorry, something went wrong.";

  const status =
    typeof searchParams?.status === "string" ? searchParams.status : null;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p>{message}</p>
      {status ? <p className="text-muted-foreground">Status: {status}</p> : null}
      <a href="/login" className="text-sm underline underline-offset-4">
        Back to login
      </a>
    </div>
  );
}
