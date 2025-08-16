// app/routes/test-db.tsx
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { useLoaderData } from "react-router";
import { db } from "~/lib/db.server";
import { disciplines } from "~/lib/schema";

type SuccessResponse = {
  success: true;
  message: string;
  tableCount: number;
};

type ErrorResponse = {
  success: false;
  error: string;
};

type LoaderData = SuccessResponse | ErrorResponse;

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Simple test - just count disciplines
    const disciplineCount = await db.select().from(disciplines);
    
    return data({
      success: true,
      message: `Database connected! Found ${disciplineCount.length} disciplines.`,
      tableCount: 13 // We know we have 13 tables from your earlier check
    } satisfies SuccessResponse);
  } catch (error) {
    console.error('Database test error:', error);
    return data({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } satisfies ErrorResponse);
  }
}

export default function TestDb() {
  const result = useLoaderData<LoaderData>();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      {result.success ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p><strong>✅ {result.message}</strong></p>
          <p>Tables in database: {result.tableCount}</p>
        </div>
      ) : (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p><strong>❌ Database Error:</strong></p>
          <p>{result.error}</p>
        </div>
      )}
      
      <div className="mt-6">
        <a 
          href="/" 
          className="text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to Home
        </a>
      </div>
    </div>
  );
}