"use client";

import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-2">
          Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}!
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          You are now signed in and can access protected content.
        </p>
      </div>
    </div>
  );
}
