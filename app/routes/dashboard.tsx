// app/routes/dashboard.tsx - Updated for v2 Schema
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { useLoaderData, Link } from "react-router";
import { db } from "~/lib/db.server";
import { athletes, competitions, events, results, people, performances, disciplines, categories } from "~/lib/schema";
import { desc, count, sql, eq } from "drizzle-orm";

type DashboardData = {
  stats: {
    totalAthletes: number;
    totalCompetitions: number;
    totalEvents: number;
    totalResults: number;
  };
  recentCompetitions: Array<{
    id: number;
    name: string;
    startDate: string;
    eventCount: number;
  }>;
  topAthletes: Array<{
    id: number;
    name: string;
    resultCount: number;
    bestPosition: number | null;
  }>;
  recentResults: Array<{
    id: number;
    athleteName: string;
    eventName: string;
    competitionName: string;
    overallPlace: string | null;
    divisionPlace: string | null;
    rawTime: string | null;
    date: string;
    disciplineName: string | null;
    rawCategory: string | null;
  }>;
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Get basic stats
    const [athleteCount, competitionCount, eventCount, resultCount] = await Promise.all([
      db.select().from(athletes),
      db.select().from(competitions),
      db.select().from(events),
      db.select().from(results),
    ]);

    // Get recent competitions with event counts
    const recentCompetitions = await db
      .select({
        id: competitions.id,
        name: competitions.name,
        startDate: competitions.startDate,
      })
      .from(competitions)
      .orderBy(desc(competitions.startDate))
      .limit(5);

    // Get event counts for each competition
    const competitionsWithCounts = await Promise.all(
      recentCompetitions.map(async (comp) => {
        const eventCountResult = await db
          .select()
          .from(events)
          .where(eq(events.competitionId, comp.id));
        
        return {
          ...comp,
          startDate: new Date(comp.startDate).toISOString().split('T')[0],
          eventCount: eventCountResult.length,
        };
      })
    );

    // Get top athletes by result count
    const topAthletes = await db
      .select({
        id: athletes.id,
        firstName: people.firstName,
        lastName: people.lastName,
        displayName: people.displayName,
      })
      .from(athletes)
      .innerJoin(people, eq(athletes.personId, people.id))
      .limit(10);

    // Get result counts and best positions for top athletes
    const topAthletesWithStats = await Promise.all(
      topAthletes.map(async (athlete) => {
        // Get results and performances for this athlete
        const athleteResults = await db
          .select({
            overallPlace: results.overallPlace,
            calculatedPosition: performances.calculatedOverallPosition,
          })
          .from(results)
          .leftJoin(performances, eq(results.performanceId, performances.id))
          .where(eq(results.athleteId, athlete.id));

        // Extract positions (prefer calculated, fall back to raw)
        const positions = athleteResults
          .map(r => r.calculatedPosition || (r.overallPlace ? parseInt(r.overallPlace) : null))
          .filter(p => p !== null && !isNaN(p)) as number[];

        return {
          ...athlete,
          name: athlete.displayName || `${athlete.firstName} ${athlete.lastName}`,
          resultCount: athleteResults.length,
          bestPosition: positions.length > 0 ? Math.min(...positions) : null,
        };
      })
    );

    // Sort by result count and take top 5
    const sortedTopAthletes = topAthletesWithStats
      .sort((a, b) => b.resultCount - a.resultCount)
      .slice(0, 5);

    // Get recent results with athlete and event info (using raw data for display)
    const recentResults = await db
      .select({
        id: results.id,
        firstName: people.firstName,
        lastName: people.lastName,
        displayName: people.displayName,
        eventName: events.name,
        competitionName: competitions.name,
        overallPlace: results.overallPlace,
        divisionPlace: results.divisionPlace,
        rawTime: results.rawTime,
        rawCategory: results.rawCategory,
        date: competitions.startDate,
        disciplineName: disciplines.name,
      })
      .from(results)
      .innerJoin(athletes, eq(results.athleteId, athletes.id))
      .innerJoin(people, eq(athletes.personId, people.id))
      .innerJoin(events, eq(results.eventId, events.id))
      .innerJoin(competitions, eq(events.competitionId, competitions.id))
      .leftJoin(disciplines, eq(events.disciplineId, disciplines.id))
      .orderBy(desc(competitions.startDate))
      .limit(10);

    const formattedResults = recentResults.map(result => ({
      ...result,
      athleteName: result.displayName || `${result.firstName} ${result.lastName}`,
      date: new Date(result.date).toISOString().split('T')[0],
    }));

    return data({
      stats: {
        totalAthletes: athleteCount.length,
        totalCompetitions: competitionCount.length,
        totalEvents: eventCount.length,
        totalResults: resultCount.length,
      },
      recentCompetitions: competitionsWithCounts,
      topAthletes: sortedTopAthletes,
      recentResults: formattedResults,
    } satisfies DashboardData);

  } catch (error) {
    console.error('Dashboard error:', error);
    return data({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default function Dashboard() {
  const dashboardData = useLoaderData<typeof loader>();

  if ('error' in dashboardData) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error loading dashboard:</strong> {dashboardData.error}
        </div>
      </div>
    );
  }

  const { stats, recentCompetitions, topAthletes, recentResults } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Paddle Performance Dashboard
            </h1>
            <nav className="space-x-4">
              <Link to="/" className="text-blue-600 hover:text-blue-800">Home</Link>
              <Link to="/search" className="text-blue-600 hover:text-blue-800">Search Athletes</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Athletes
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {stats.totalAthletes.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Competitions
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {stats.totalCompetitions}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Events
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {stats.totalEvents}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Race Results
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {stats.totalResults.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Recent Competitions */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Recent Competitions
                </h2>
                <div className="space-y-3">
                  {recentCompetitions.map((competition) => (
                    <div key={competition.id} className="flex justify-between items-start p-3 bg-gray-50 rounded">
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm">
                          {competition.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {competition.startDate} • {competition.eventCount} events
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Athletes */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Most Active Athletes
                </h2>
                <div className="space-y-3">
                  {topAthletes.map((athlete) => (
                    <div key={athlete.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm">
                          {athlete.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {athlete.resultCount} races
                          {athlete.bestPosition && ` • Best: ${athlete.bestPosition}${athlete.bestPosition === 1 ? 'st' : athlete.bestPosition === 2 ? 'nd' : athlete.bestPosition === 3 ? 'rd' : 'th'}`}
                        </p>
                      </div>
                      <Link 
                        to={`/athlete/${athlete.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        View →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Results */}
            <div className="bg-white overflow-hidden shadow rounded-lg lg:col-span-2">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Recent Results
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Athlete
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentResults.map((result) => {
                        // Parse position for display
                        const position = result.overallPlace ? parseInt(result.overallPlace) : null;
                        
                        return (
                          <tr key={result.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {result.athleteName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>
                                <div className="font-medium">{result.eventName}</div>
                                <div className="text-xs text-gray-400">{result.competitionName}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {position ? (
                                <div className="space-y-1">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    position === 1 ? 'bg-yellow-100 text-yellow-800' :
                                    position === 2 ? 'bg-gray-100 text-gray-800' :
                                    position === 3 ? 'bg-orange-100 text-orange-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    #{position}
                                  </span>
                                  {result.divisionPlace && (
                                    <div className="text-xs text-gray-500">
                                      Div: {result.divisionPlace}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="font-mono">
                                {result.rawTime || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>
                                <div>{result.date}</div>
                                {result.disciplineName && (
                                  <div className="text-xs text-gray-400">{result.disciplineName}</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}