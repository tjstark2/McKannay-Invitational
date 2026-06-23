// App-wide configuration knobs, kept in one place so they're easy to change.
//
// NOTE ON PASSWORDS: these are *soft gates*. They live in the browser bundle,
// so anyone technical can read them — they keep casual users out, nothing more.
// Real security would require Supabase auth (a future option). When we add
// multiple trips, the admin password is the natural thing to move onto each
// trip row so every commissioner controls their own.

export const APP_CONFIG = {
  // Which trip the app loads by default. The data layer is already trip-aware,
  // so a future trip-selector screen just changes this value at runtime.
  defaultJoinCode: "MCK2026",

  // Password to enter the app at all.
  entryPassword: "Pass",

  // Password to reach the Admin area.
  adminPassword: "Admin",
};

// sessionStorage keys for "already unlocked this session" so users aren't
// re-prompted on every navigation. Session-scoped: clears when the tab closes.
export const ENTRY_UNLOCK_KEY = "mck-entry-unlocked";
export const ADMIN_UNLOCK_KEY = "mck-admin-unlocked";