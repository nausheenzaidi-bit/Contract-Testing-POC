import type { Resolvers } from "./generated/graphql";

// Add only the fields your frontend queries.
// Types are enforced via the generated `Resolvers` type.
export const resolvers: Resolvers = {
  Query: {
    getUser: (_parent, args) => {
      // Minimal mock matching `GetUser` query shape
      return {
        id: "mock-user-id",
        profileId: "mock-profile-id",
        settings: {
          spoilers_enabled: "false",
          alerts: [
            { type: "push", enabled: true },
            { type: "email", enabled: false },
          ],
          social: [
            { type: "likes", enabled: true },
            { type: "comments", enabled: true },
          ],
        },
      } as any;
    },
  },
  Mutation: {
    setGlobalAlerts: (_parent, args) => {
      // Schema input type is `AlertInput { type: AlertTypes!, value: Boolean! }`
      // Query expects Settings { spoilers_enabled, alerts {type enabled}, social {type enabled} }
      const input = (args as any).input as Array<{ type: string; value: boolean }>;

      const alerts = (input || []).map((i) => ({
        type: i.type,
        enabled: Boolean(i.value),
      }));

      // Mock behavior: treat all inputs as "alerts" and mirror them into "social" as well,
      // so the frontend always gets deterministic data for both arrays.
      const social = (input || []).map((i) => ({
        type: i.type,
        enabled: Boolean(i.value),
      }));

      const spoilers_enabled = String(
        input?.find((i) => String(i.type).toLowerCase().includes("spoiler"))?.value ?? false,
      );

      return { spoilers_enabled, alerts, social } as any;
    },
  },
};

