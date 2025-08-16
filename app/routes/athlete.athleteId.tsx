// app/routes/athlete.$athleteId.tsx - Updated for v2 Schema
import type { Route } from "./+types/athlete.athleteId";
import { data } from "react-router";
import { useLoaderData, Link } from "react-router";
import { db } from "~/lib/db.server";
import { athletes, competitions, events, results, people, performances, disciplines, categories } from "~/lib/schema";
import { eq, desc, sql, count, min } from "drizzle-orm";

type AthleteData = {
  athlete: {
    id: number;
    name: string;
    gender: string | null;
    status: string;
  };
  stats: {
    totalRaces: number;
    bestPosition: number | null;
    averagePosition: number | null;
    recentRaces: number; // races in last 6 months
    bestRankingPoints: number | null;
    totalPodiums: number;
  };
  raceHistory: Array<{
    id: number;
    eventName: string;
    competitionName: string;
    overallPlace: string | null;
    divisionPlace: string | null;
    calculatedPosition: number | null;
    bibNumber: string | null;
    rawTime: string | null;
    timeMs: number | null;
    rankingPoints: number | null;
    date: string;
    disciplineName: string | null;
    categoryName: string | null;
    rawCategory: string | null;
    isPodium: boolean | null;
  }>;
  bestTimes: Array<{
    disciplineName: string;
    bestTime: string;
    bestTimeMs: number;
    eventName: string;
    competitionName: string;
    date: string;
    rankingPoints: number | null;
  }>;
};

export async function loader({ params }: Route.LoaderArgs) {
  const athleteId = parseInt(params.athleteId);
  
  if (isNaN(athleteId)) {
    throw new Response("Invalid athlete ID", { status: 400 });
  }

  try {
    // Get athlete basic info
    const athleteInfo = await db
      .select({
        id: athletes.id,
        firstName: people.firstName,
        lastName: people.lastName,
        displayName: people.displayName,
        gender: people.gender,
        status: athletes.status,
      })
      .from(athletes)
      .innerJoin(people, eq(athletes.personId, people.id))
      .where(eq(athletes.id, athleteId))
      .limit(1);

    if (athleteInfo.length === 0) {
      throw new Response("Athlete not found", { status: 404 });
    }

    const athlete = {
      ...athleteInfo[0],
      name: athleteInfo[0].displayName || `${athleteInfo[0].firstName} ${athleteInfo[0].lastName}`,
    };

    // Get complete race history with both raw and calculated data
    const raceHistory = await db
      .select({
        id: results.id,
        eventName: events.name,
        competitionName: competitions.name,
        
        // Raw data (as appeared on race website)
        overallPlace: results.overallPlace,
        divisionPlace: results.divisionPlace,
        bibNumber: results.bibNumber,
        rawTime: results.rawTime,
        rawCategory: results.rawCategory,
        rawCraftType: results.rawCraftType,
        
        // Calculated performance data
        calculatedPosition: performances.calculatedOverallPosition,
        rankingPlace: performances.calculatedGenderPosition, // This stores ranking_place
        timeMs: performances.timeMilliseconds,
        rankingPoints: performances.rankingPoints,
        isPodium: performances.isPodiumFinish,
        
        // Event details
        date: competitions.startDate,
        disciplineName: disciplines.name,
        categoryName: categories.name,
      })
      .from(results)
      .innerJoin(events, eq(results.eventId, events.id))
      .innerJoin(competitions, eq(events.competitionId, competitions.id))
      .leftJoin(performances, eq(results.performanceId, performances.id))
      .leftJoin(disciplines, eq(events.disciplineId, disciplines.id))
      .leftJoin(categories, eq(events.categoryId, categories.id))
      .where(eq(results.athleteId, athleteId))
      .orderBy(desc(competitions.startDate));

    // Format race history - convert Date objects to strings
    const formattedHistory = raceHistory.map(race => ({
      ...race,
      date: new Date(race.date).toISOString().split('T')[0],
    }));

    // Calculate stats using both raw and calculated data
    const calculatedPositions = raceHistory
      .map(r => r.calculatedPosition)
      .filter(p => p !== null) as number[];
    
    // Fallback to raw positions if calculated positions aren't available
    const rawPositions = raceHistory
      .map(r => r.overallPlace ? parseInt(r.overallPlace) : null)
      .filter(p => p !== null && !isNaN(p)) as number[];
    
    const allPositions = calculatedPositions.length > 0 ? calculatedPositions : rawPositions;
    
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 6);
    
    const recentRaces = raceHistory.filter(
      r => new Date(r.date) > recentDate
    ).length;

    const rankingPoints = raceHistory
      .map(r => r.rankingPoints)
      .filter(p => p !== null) as number[];
    
    const podiumCount = raceHistory.filter(r => r.isPodium).length;

    const stats = {
      totalRaces: raceHistory.length,
      bestPosition: allPositions.length > 0 ? Math.min(...allPositions) : null,
      averagePosition: allPositions.length > 0 ? Math.round(allPositions.reduce((a, b) => a + b, 0) / allPositions.length) : null,
      recentRaces,
      bestRankingPoints: rankingPoints.length > 0 ? Math.max(...rankingPoints) : null,
      totalPodiums: podiumCount,
    };

    // Get best times by discipline (using calculated times when available, fallback to raw)
    const timesWithDiscipline = raceHistory
      .filter(r => (r.timeMs && r.timeMs > 0) || r.rawTime)
      .reduce((acc, race) => {
        const discipline = race.disciplineName || 'Unknown';
        const timeMs = race.timeMs || 0;
        const timeDisplay = race.rawTime || 'Unknown';
        
        if (timeMs > 0 && (!acc[discipline] || timeMs < acc[discipline].bestTimeMs)) {
          acc[discipline] = {
            disciplineName: discipline,
            bestTime: timeDisplay,
            bestTimeMs: timeMs,
            eventName: race.eventName,
            competitionName: race.competitionName,
            date: race.date,
            rankingPoints: race.rankingPoints,
          };
        }
        return acc;
      }, {} as Record<string, any>);

    const bestTimes = Object.values(timesWithDiscipline);

    return data({
      athlete,
      stats,
      raceHistory: formattedHistory,
      bestTimes,
    } satisfies AthleteData);

  } catch (error) {
    console.error('Athlete profile error:', error);
    if (error instanceof Response) {
      throw error;
    }
    throw new Response("Internal server error", { status: 500 });
  }
}

export default function Component({ params }: Route.ComponentProps) {
  const { athlete, stats, raceHistory, bestTimes } = useLoaderData<AthleteData>();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {athlete.name}
              </h1>
              <p className="text-gray-600">
                {athlete.gender} • {athlete.status} Athlete
              </p>
            </div>
            <nav className="space-x-4">
              <Link to="/dashboard" className="text-blue-600 hover:text-blue-800">Dashboard</Link>
              <Link to="/" className="text-blue-600 hover:text-blue-800">Home</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Races
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {stats.totalRaces}
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
                        Best Position
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {stats.bestPosition ? (
                          <span className={`${
                            stats.bestPosition === 1 ? 'text-yellow-600' :
                            stats.bestPosition === 2 ? 'text-gray-600' :
                            stats.bestPosition === 3 ? 'text-orange-600' :
                            'text-blue-600'
                          }`}>
                            #{stats.bestPosition}
                          </span>
                        ) : '-'}
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
                        Avg Position
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {stats.averagePosition ? `#${stats.averagePosition}` : '-'}
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
                        Podium Finishes
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        <span className="text-yellow-600">{stats.totalPodiums}</span>
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
                        Best Points
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {stats.bestRankingPoints ? Math.round(stats.bestRankingPoints) : '-'}
                      </dd>
                      <dt className="text-xs text-gray-400">
                        ranking points
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            
            {/* Race History - Full Width */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Complete Race History ({raceHistory.length} races)
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
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
                          Points
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Craft
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gender
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {raceHistory.map((race) => {
                        // Use calculated position if available, fallback to raw
                        const position = race.calculatedPosition || (race.overallPlace ? parseInt(race.overallPlace) : null);
                        
                        return (
                          <tr key={race.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {race.date}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div>
                                <div className="font-medium">{race.eventName}</div>
                                <div className="text-xs text-gray-500">{race.competitionName}</div>
                                <div className="text-xs text-gray-400">{race.disciplineName || 'Unknown'}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="space-y-1">
                                {position ? (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    position === 1 ? 'bg-yellow-100 text-yellow-800' :
                                    position === 2 ? 'bg-gray-100 text-gray-800' :
                                    position === 3 ? 'bg-orange-100 text-orange-800' :
                                    position <= 10 ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    #{position}
                                    {race.isPodium && ' 🏆'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                                {race.divisionPlace && (
                                  <div className="text-xs text-gray-500">
                                    Div: {race.divisionPlace}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="font-mono">
                                {race.rawTime || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {race.rankingPoints ? (
                                <span className="font-semibold text-blue-600">
                                  {Math.round(race.rankingPoints)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>
                                {(() => {
                                  // Use discipline name for semantic craft type
                                  let craftType = 'Other';
                                  let colorClass = 'bg-gray-100 text-gray-800';
                                  
                                  if (race.disciplineName?.includes('Outrigger') || race.rawCategory?.includes('OC')) {
                                    craftType = 'Outrigger Canoe';
                                    colorClass = 'bg-green-100 text-green-800';
                                  } else if (race.disciplineName?.includes('Surfski')) {
                                    craftType = 'Surfski';
                                    colorClass = 'bg-purple-100 text-purple-800';
                                  } else if (race.disciplineName?.includes('SUP')) {
                                    craftType = 'SUP';
                                    colorClass = 'bg-blue-100 text-blue-800';
                                  } else if (race.disciplineName?.includes('Kayak')) {
                                    craftType = 'Kayak';
                                    colorClass = 'bg-orange-100 text-orange-800';
                                  } else if (race.disciplineName?.includes('Dragon')) {
                                    craftType = 'Dragon Boat';
                                    colorClass = 'bg-red-100 text-red-800';
                                  }
                                  
                                  return (
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
                                      {craftType}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>
                                <div className="text-xs font-medium">
                                  {race.rawCategory || race.categoryName || 'Unknown'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                athlete.gender === 'MALE' ? 'bg-blue-100 text-blue-800' :
                                athlete.gender === 'FEMALE' ? 'bg-pink-100 text-pink-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {athlete.gender === 'MALE' ? 'M' : 
                                 athlete.gender === 'FEMALE' ? 'F' : 
                                 athlete.gender || '?'}
                              </span>
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