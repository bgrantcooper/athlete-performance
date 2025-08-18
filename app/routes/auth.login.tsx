// app/routes/auth.login.tsx - For React Router v7 with routes.ts
import type { Route } from "./+types/auth.login";
import { Form, Link } from "react-router";
import { json, redirect } from "@remix-run/node";
import { authenticateUser, createUserSession, getUserSession } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const userSession = await getUserSession(request);
  if (userSession) {
    throw redirect("/dashboard");
  }
  return json({});
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString() || "/dashboard";

  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const user = await authenticateUser(email, password);
    if (!user) {
      return json({ error: "Invalid email or password" }, { status: 400 });
    }

    return createUserSession(user, redirectTo);
  } catch (error) {
    return json({ error: "Login failed" }, { status: 500 });
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to Paddle Performance
          </h2>
        </div>
        <Form method="post" className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {actionData?.error && (
            <div className="text-red-600 text-sm text-center">
              {actionData.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Sign in
            </button>
          </div>

          <div className="text-center">
            <Link to="/auth/register" className="text-blue-600 hover:text-blue-500">
              Don't have an account? Sign up
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}