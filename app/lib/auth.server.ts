// app/lib/auth.server.ts
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import bcrypt from "bcryptjs";
import { db } from "./db.server";
import { users, userActivity, type User } from "./schema";
import { eq, and, gte, count } from "drizzle-orm";

// Session storage
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__paddle_session",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    secrets: [process.env.SESSION_SECRET || "dev-secret"],
  },
});

export type UserSession = {
  userId: string;
  email: string;
  tier: 'free' | 'premium' | 'pro';
  firstName?: string;
  lastName?: string;
};

// Auth utilities
export async function createUserSession(user: User, redirectTo: string = "/dashboard") {
  const session = await sessionStorage.getSession();
  const userSession: UserSession = {
    userId: user.id,
    email: user.email,
    tier: user.tier,
    firstName: user.firstName,
    lastName: user.lastName,
  };
  
  session.set("user", userSession);
  
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function getUserSession(request: Request): Promise<UserSession | null> {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return session.get("user") || null;
}

export async function requireUser(request: Request): Promise<UserSession> {
  const userSession = await getUserSession(request);
  if (!userSession) {
    throw redirect("/auth/login");
  }
  return userSession;
}

export async function requirePremium(request: Request): Promise<UserSession> {
  const userSession = await requireUser(request);
  if (userSession.tier === 'free') {
    throw redirect("/upgrade");
  }
  return userSession;
}

export async function logout(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// User management
export async function createUser(
  email: string, 
  password: string, 
  firstName?: string, 
  lastName?: string
) {
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    throw new Error("User already exists");
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    firstName,
    lastName,
  }).returning();

  return user;
}

export async function authenticateUser(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    return null;
  }
  return user;
}

// Freemium limits
export const TIER_LIMITS = {
  free: {
    athleteViews: 10,
    comparisons: 0,
    virtualSeries: 0,
  },
  premium: {
    athleteViews: Infinity,
    comparisons: Infinity,
    virtualSeries: 5,
  },
  pro: {
    athleteViews: Infinity,
    comparisons: Infinity,
    virtualSeries: Infinity,
  },
} as const;

export async function checkViewLimit(
  userSession: UserSession,
  activityType: 'athlete_view' | 'comparison_view' | 'virtual_series_create'
): Promise<boolean> {
  if (userSession.tier !== 'free') return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: count() })
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userSession.userId),
        eq(userActivity.activityType, activityType),
        gte(userActivity.createdAt, today)
      )
    );

  const currentCount = result.count;
  const limit = TIER_LIMITS.free[activityType === 'athlete_view' ? 'athleteViews' : 
                                  activityType === 'comparison_view' ? 'comparisons' : 'virtualSeries'];

  return currentCount < limit;
}

export async function trackActivity(
  userSession: UserSession,
  activityType: 'athlete_view' | 'result_view' | 'comparison_view' | 'virtual_series_create',
  resourceId?: string,
  metadata?: Record<string, any>
) {
  await db.insert(userActivity).values({
    userId: userSession.userId,
    activityType,
    resourceId,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

// Athlete claiming
export async function canUserViewAthlete(
  userSession: UserSession | null,
  athleteId: string
): Promise<{ canView: boolean; reason?: string }> {
  // Public athletes are always viewable
  const athlete = await db.query.athletes.findFirst({
    where: eq(athletes.id, athleteId),
    with: {
      privacy: true,
    },
  });

  if (!athlete?.privacy?.isPublic && !userSession) {
    return { canView: false, reason: "private_athlete" };
  }

  if (!userSession) {
    return { canView: true }; // Public athlete, no user session needed
  }

  // Check if user has claimed this athlete
  const userLink = await db.query.userAthleteLinks.findFirst({
    where: and(
      eq(userAthleteLinks.userId, userSession.userId),
      eq(userAthleteLinks.athleteId, athleteId)
    ),
  });

  if (userLink) {
    return { canView: true }; // User owns this athlete
  }

  // Check view limits for free users
  if (userSession.tier === 'free') {
    const canView = await checkViewLimit(userSession, 'athlete_view');
    if (!canView) {
      return { canView: false, reason: "view_limit_exceeded" };
    }
  }

  return { canView: true };
}