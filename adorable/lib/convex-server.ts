/**
 * lib/convex-server.ts
 *
 * Server-side Convex helpers for Next.js API routes.
 *
 * Usage in a route handler:
 *
 *   import { convexMutation, convexQuery, isConvexEnabled } from "@/lib/convex-server";
 *   import { api } from "@/convex/_generated/api";
 *
 *   if (isConvexEnabled()) {
 *     const project = await convexQuery(api.projects.getById, { projectId });
 *   }
 *
 * The helpers automatically extract the Clerk session token and pass it to
 * Convex so every mutation/query is authenticated as the current user.
 */

import { fetchMutation, fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import type {
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";

/** True when NEXT_PUBLIC_CONVEX_URL is set — use to guard Convex calls. */
export function isConvexEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL?.trim());
}

/**
 * Get the Clerk session token formatted for Convex.
 * Returns null if the user is not authenticated.
 */
async function getConvexToken(): Promise<string | null> {
  try {
    const { getToken } = await auth();
    return await getToken({ template: "convex" });
  } catch {
    return null;
  }
}

/**
 * Execute a Convex query server-side with the current Clerk auth token.
 * Falls back to unauthenticated if no session token is available.
 */
export async function convexQuery<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
): Promise<FunctionReturnType<Query>> {
  const token = await getConvexToken();
  const options = token ? { token } : {};
  return fetchQuery(query, ...args, options as never);
}

/**
 * Execute a Convex mutation server-side with the current Clerk auth token.
 */
export async function convexMutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  ...args: OptionalRestArgs<Mutation>
): Promise<FunctionReturnType<Mutation>> {
  const token = await getConvexToken();
  const options = token ? { token } : {};
  return fetchMutation(mutation, ...args, options as never);
}

/**
 * Execute a Convex mutation with an explicit token (for API routes that
 * extract the token from headers rather than from the Clerk session).
 */
export async function convexMutationWithToken<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  token: string | null,
  ...args: OptionalRestArgs<Mutation>
): Promise<FunctionReturnType<Mutation>> {
  const options = token ? { token } : {};
  return fetchMutation(mutation, ...args, options as never);
}

/**
 * Execute a Convex query with an explicit token.
 */
export async function convexQueryWithToken<Query extends FunctionReference<"query">>(
  query: Query,
  token: string | null,
  ...args: OptionalRestArgs<Query>
): Promise<FunctionReturnType<Query>> {
  const options = token ? { token } : {};
  return fetchQuery(query, ...args, options as never);
}
