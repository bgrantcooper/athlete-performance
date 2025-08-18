import { type RouteConfig, index, route, prefix } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"), 
    route("test-db","routes/test-db.tsx"),
    route("dashboard","routes/dashboard.tsx"),
    route("athlete/:athleteId", "routes/athlete.athleteId.tsx"),
    ...prefix("auth", [
        route("login", "routes/auth.login.tsx"),
        route("logout", "routes/auth.logout.tsx"),
        route("register","routes/auth.register.tsx"),
    ])
] satisfies RouteConfig;
