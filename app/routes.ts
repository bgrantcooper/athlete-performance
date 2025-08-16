import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"), 
    route("test-db","routes/test-db.tsx"),
    route("dashboard","routes/dashboard.tsx"),
    route("athlete/:athleteId", "routes/athlete.athleteId.tsx")
] satisfies RouteConfig;
