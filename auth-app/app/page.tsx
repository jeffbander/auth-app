import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Auth App</h1>
        <p className="text-lg text-gray-600 mb-8">
          Built with Next.js 14, Clerk, and Convex
        </p>

        <div className="flex gap-4 justify-center">
          {userId ? (
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
