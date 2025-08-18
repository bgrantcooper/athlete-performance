// app/components/auth/AuthGuard.tsx
import { Form } from "react-router";

import type { UserSession } from "~/lib/auth.server";

interface AuthGuardProps {
  userSession: UserSession | null;
  requiredTier?: 'free' | 'premium' | 'pro';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  userSession, 
  requiredTier = 'free', 
  children, 
  fallback 
}: AuthGuardProps) {
  if (!userSession) {
    return fallback || <LoginPrompt />;
  }

  const tierHierarchy = { free: 0, premium: 1, pro: 2 };
  const userTierLevel = tierHierarchy[userSession.tier];
  const requiredTierLevel = tierHierarchy[requiredTier];

  if (userTierLevel < requiredTierLevel) {
    return <UpgradePrompt requiredTier={requiredTier} />;
  }

  return <>{children}</>;
}

function LoginPrompt() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">
        Sign in to continue
      </h3>
      <p className="text-blue-700 mb-4">
        Create a free account to access athlete profiles and track your performance.
      </p>
      <div className="space-x-4">
        <a 
          href="/auth/login" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Sign In
        </a>
        <a 
          href="/auth/register" 
          className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
        >
          Create Account
        </a>
      </div>
    </div>
  );
}

function UpgradePrompt({ requiredTier }: { requiredTier: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
      <h3 className="text-lg font-semibold text-amber-900 mb-2">
        Upgrade Required
      </h3>
      <p className="text-amber-700 mb-4">
        This feature requires a {requiredTier} subscription.
      </p>
      <a 
        href="/upgrade" 
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700"
      >
        Upgrade Now
      </a>
    </div>
  );
}