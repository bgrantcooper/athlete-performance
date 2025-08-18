// Updated app/routes/athlete.$athleteId.tsx
import type { LoaderFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "react-router";
import { db } from "~/lib/db.server";
import { athletes, results, events, competitions } from "~/lib/schema";
import { eq, desc, count } from "drizzle-orm";
import { 
  getUserSession, 
  canUserViewAthlete, 
  trackActivity, 
  checkViewLimit,
  TIER_LIMITS 
} from "~/lib/auth.server";
import { AuthGuard } from "~/components/auth/AuthGuard";
import { ViewLimitBanner } from "~/components/auth/ViewLimitBanner";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const athleteId = params.athleteId;
  if (!athleteId) {
    throw new Response("Athlete not found", { status: 404 });
  }

  const userSession = await getUserSession(request);
  
  // Check if user can view this athlete
  const { canView, reason } = await canUserViewAthlete(userSession, athleteId);
  
  if (!canView) {
    return json({ 
      athlete: null, 
      results: [], 
      canView: false, 
      reason,
      userSession,
      viewsRemaining: 0 
    });
  }

  // Get athlete data
  const athlete = await db.query.athletes.findFirst({
    where: eq(athletes.id, athleteId),
  });

  if (!athlete) {
    throw new Response("Athlete not found", { status: 404 });
  }

  // Get athlete's results
  const athleteResults = await db
    .select({
      id: results.id,
      position: results.position,
      time: results.time,
      points: results.points,
      eventName: events.name,
      eventDate: events.date,
      competitionName: competitions.name,
      venue: events.venue,
    })
    .from(results)
    .innerJoin(events, eq(results.eventId, events.id))
    .innerJoin(competitions, eq(events.competitionId, competitions.id))
    .where(eq(results.athleteId, athleteId))
    .orderBy(desc(events.date))
    .limit(userSession?.tier === 'free' ? 10 : 100);

  // Track the view if user is logged in
  if (userSession) {
    await trackActivity(userSession, 'athlete_view', athleteId);
  }

  // Calculate views remaining for free users
  let viewsRemaining = Infinity;
  if (userSession?.tier === 'free') {
    const canViewMore = await checkViewLimit(userSession, 'athlete_view');
    const maxViews = TIER_LIMITS.free.athleteViews;
    // This is simplified - you'd want to get actual count from today
    viewsRemaining = canViewMore ? maxViews - 1 : 0;
  }

  return json({
    athlete,
    results: athleteResults,
    canView: true,
    userSession,
    viewsRemaining: userSession?.tier === 'free' ? viewsRemaining : Infinity,
  });
}

export default function AthleteProfile() {
  const { athlete, results, canView, reason, userSession, viewsRemaining } = useLoaderData<typeof loader>();

  if (!canView) {
    if (reason === 'view_limit_exceeded') {
      return (
        <div className="container mx-auto px-4 py-8">
          <ViewLimitBanner viewsRemaining={0} maxViews={TIER_LIMITS.free.athleteViews} />
          <AuthGuard userSession={userSession} requiredTier="premium">
            <div>This content requires premium access</div>
          </AuthGuard>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <AuthGuard userSession={userSession}>
          <div>This athlete profile is private</div>
        </AuthGuard>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {userSession?.tier === 'free' && viewsRemaining < Infinity && (
        <ViewLimitBanner 
          viewsRemaining={viewsRemaining} 
          maxViews={TIER_LIMITS.free.athleteViews} 
        />
      )}
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {athlete?.firstName} {athlete?.lastName}
            </h1>
            <p className="text-gray-600">
              {athlete?.city}, {athlete?.state} • {athlete?.country}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Race Results</h2>
          
          {results.length === 0 ? (
            <p className="text-gray-500">No race results found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Competition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(result.eventDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.competitionName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.eventName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{result.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {userSession?.tier === 'free' && results.length >= 10 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Showing first 10 results. 
                <Link to="/upgrade" className="font-medium underline ml-1">
                  Upgrade to see all results
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}