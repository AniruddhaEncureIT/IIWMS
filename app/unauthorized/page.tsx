"use client";

import { useRouter } from "next/navigation";
import { ShieldX, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You do not have permission to view this page. Please contact your system administrator if
          you believe this is an error.
        </p>
        <button
          onClick={() => router.replace("/dashboard")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
