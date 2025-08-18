// app/routes/dashboard.tsx - Updated for current schema
import type { Route } from "./+types/dashboard";
import { json } from "@remix-run/node";
import { Link } from "react-router";
import { getUserSession } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { sql } from "drizzle-orm";

export async function loader({ request }: Route.LoaderArgs) {
  const userSession = await getUserSession(request);
  
  // Use raw SQL to match actual database structure
  const competitions = await db.execute(sql`
    SELECT 
      competition_id,
      name,
      start_date,
      end_date,
      status,
      promotion_provider,
      created_at
    FROM competitions 
    ORDER BY created_at DESC 
    LIMIT 10
  `);

  const stats = {
    totalCompetitions: competitions.length,
    userTier: userSession?.tier || 'not logged in',
  };

  return json({
    userSession,
    competitions: competitions.rows,
    stats,
  });
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { userSession, competitions, stats } = loaderData;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard
        </h1>
        {userSession ? (
          <p className="text-gray-600">
            Welcome back, {userSession.firstName} {userSession.lastName}! 
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {userSession.tier}
            </span>
          </p>
        ) : (
          <p className="text-gray-600">Welcome to Paddle Performance</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Recent Competitions
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {stats.totalCompetitions}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Account Status
          </h3>
          <p className="text-lg font-medium text-gray-700 capitalize">
            {stats.userTier}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {!userSession ? (
              <Link
                to="/auth/register"
                className="block text-blue-600 hover:text-blue-800"
              >
                Sign Up
              </Link>
            ) : (
              <Link
                to="/athlete"
                className="block text-blue-600 hover:text-blue-800"
              >
                View Athletes
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Recent Competitions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Competitions
          </h2>
        </div>
        <div className="p-6">
          {competitions.length === 0 ? (
            <p className="text-gray-500">No competitions found.</p>
          ) : (
            <div className="space-y-4">
              {competitions.map((competition) => (
                <div
                  key={competition.competition_id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {competition.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {competition.short_name} • {competition.year}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(competition.start_date).toLocaleDateString()} - {new Date(competition.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {competition.status}
                    </span>
                  </div>
                  
                  {/* Show service provider info if available */}
                  {competition.promotion_provider && (
                    <div className="mt-2 text-xs text-gray-500">
                      Promoted via: {competition.promotion_provider}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}