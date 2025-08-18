// app/routes/auth.logout.tsx - Handle both GET and POST for logout
import type { Route } from "./+types/auth.logout";
import { logout } from "~/lib/auth.server";
import { json, redirect } from "@remix-run/node";

export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

export async function loader({ request }: Route.LoaderArgs) {
  // Allow logout via GET request for convenience
    return logout(request);
}