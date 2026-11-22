"use client";

import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  organization: string;
  role: string;
  created_at?: string;
}

const TOKEN_KEY = "oxeous_auth_token_v1";
const USER_KEY = "oxeous_auth_user_v1";
const LOCAL_USERS_KEY = "oxeous_local_accounts_v1";

const API_BASE_CANDIDATES = [
  process.env.NEXT_PUBLIC_API_URL,
  "http://localhost:8000",
  "http://127.0.0.1:8000",
].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);

async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return input;
}

interface LocalStoredUser extends AuthUser {
  password_hash: string;
}

function readLocalUsers(): LocalStoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalStoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: LocalStoredUser[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {}
}

function persistSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {}
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean;
  backendReachable: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (params: {
    fullName: string;
    email: string;
    password: string;
    organization: string;
    accessCode: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
}

async function callBackendAuth<T>(
  path: string,
  init: RequestInit
): Promise<{ reached: true; ok: boolean; status: number; data: T | { detail?: string } } | { reached: false }> {
  for (const base of API_BASE_CANDIDATES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${base}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });
      clearTimeout(timeout);
      // Treat 404 (auth route not deployed yet) or 5xx as unreachable so we try next candidate / fallback
      if (res.status === 404 || res.status >= 500) {
        continue;
      }
      const data = await res.json().catch(() => ({ detail: res.statusText }));
      return { reached: true, ok: res.ok, status: res.status, data };
    } catch {
      // Try next candidate
    }
  }
  return { reached: false };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,
  backendReachable: true,

  hydrate: async () => {
    if (typeof window === "undefined") {
      set({ hydrated: true });
      return;
    }
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    const storedUserRaw = window.localStorage.getItem(USER_KEY);
    let storedUser: AuthUser | null = null;
    if (storedUserRaw) {
      try {
        storedUser = JSON.parse(storedUserRaw) as AuthUser;
      } catch {}
    }

    if (!storedToken || !storedUser) {
      set({ user: null, token: null, hydrated: true });
      return;
    }

    // Local preview token stays valid locally without hammering offline backend
    if (storedToken.startsWith("local_")) {
      set({ user: storedUser, token: storedToken, hydrated: true });
      return;
    }

    // Verify cloud token with /auth/me
    const res = await callBackendAuth<{ authenticated: boolean; user: AuthUser }>("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${storedToken}` },
    });

    if (res.reached) {
      if (res.ok && "user" in res.data) {
        persistSession(storedToken, res.data.user);
        set({ user: res.data.user, token: storedToken, hydrated: true, backendReachable: true });
      } else if (res.status === 401) {
        clearSession();
        set({ user: null, token: null, hydrated: true, backendReachable: true });
      } else {
        set({ user: storedUser, token: storedToken, hydrated: true, backendReachable: true });
      }
    } else {
      // Backend temporarily offline -> keep existing signed-in session gracefully
      set({ user: storedUser, token: storedToken, hydrated: true, backendReachable: false });
    }
  },

  signIn: async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const res = await callBackendAuth<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    if (res.reached) {
      if (res.ok && "token" in res.data && "user" in res.data) {
        persistSession(res.data.token, res.data.user);
        set({ user: res.data.user, token: res.data.token, hydrated: true, backendReachable: true });
        return { ok: true };
      }

      // If the user previously created an account locally while backend was offline,
      // verify against local hash and auto-migrate their account into the live backend seamlessly.
      if (res.status === 401) {
        const locals = readLocalUsers();
        const match = locals.find((u) => u.email === cleanEmail);
        const pwHash = await sha256Hex(`oxe:${cleanEmail}:${password}`);
        if (match && match.password_hash === pwHash) {
          const migrated = await callBackendAuth<{ token: string; user: AuthUser }>("/auth/register", {
            method: "POST",
            body: JSON.stringify({
              full_name: match.full_name,
              email: cleanEmail,
              password,
              organization: match.organization || "",
              access_code: "OXEOUS-2026",
            }),
          });
          if (migrated.reached && migrated.ok && "token" in migrated.data && "user" in migrated.data) {
            persistSession(migrated.data.token, migrated.data.user);
            set({ user: migrated.data.user, token: migrated.data.token, hydrated: true, backendReachable: true });
            return { ok: true };
          }
          // Even if backend migration couldn't complete, honour the verified local account
          const { password_hash: _, ...publicUser } = match;
          const localToken = `local_${match.id}_${Date.now()}`;
          persistSession(localToken, publicUser);
          set({ user: publicUser, token: localToken, hydrated: true, backendReachable: true });
          return { ok: true };
        }
      }

      const errMsg = ("detail" in res.data && res.data.detail) || "Invalid email or password.";
      return { ok: false, error: errMsg };
    }

    // Offline / static-export fallback against local account registry
    const locals = readLocalUsers();
    const match = locals.find((u) => u.email === cleanEmail);
    const pwHash = await sha256Hex(`oxe:${cleanEmail}:${password}`);
    if (!match || match.password_hash !== pwHash) {
      return {
        ok: false,
        error: "Invalid email or password. If you haven't registered on this device yet, switch to Create Account.",
      };
    }

    const { password_hash: _, ...publicUser } = match;
    const localToken = `local_${match.id}_${Date.now()}`;
    persistSession(localToken, publicUser);
    set({ user: publicUser, token: localToken, hydrated: true, backendReachable: false });
    return { ok: true };
  },

  signUp: async ({ fullName, email, password, organization, accessCode }) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanOrg = organization.trim();
    const cleanCode = accessCode.trim().toUpperCase();

    const res = await callBackendAuth<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: cleanName,
        email: cleanEmail,
        password,
        organization: cleanOrg,
        access_code: cleanCode,
      }),
    });

    if (res.reached) {
      if (res.ok && "token" in res.data && "user" in res.data) {
        persistSession(res.data.token, res.data.user);
        set({ user: res.data.user, token: res.data.token, hydrated: true, backendReachable: true });
        return { ok: true };
      }
      const errMsg = ("detail" in res.data && res.data.detail) || "Could not create account.";
      return { ok: false, error: errMsg };
    }

    // Offline / static-export B2B invite code gate
    const VALID_LOCAL_CODES = ["OXEOUS-2026", "EUDR-PILOT", "OXEOUS-B2B"];
    if (!VALID_LOCAL_CODES.includes(cleanCode)) {
      return {
        ok: false,
        error: "Invalid enterprise access code. Request a B2B pilot invite to unlock registration.",
      };
    }

    // Offline / static-export fallback registry in localStorage
    const locals = readLocalUsers();
    if (locals.some((u) => u.email === cleanEmail)) {
      return { ok: false, error: "An account with this email already exists. Please sign in." };
    }

    const pwHash = await sha256Hex(`oxe:${cleanEmail}:${password}`);
    const newUser: LocalStoredUser = {
      id: `usr_${Math.random().toString(36).slice(2, 12)}`,
      email: cleanEmail,
      full_name: cleanName,
      organization: cleanOrg,
      role: "operator",
      created_at: new Date().toISOString(),
      password_hash: pwHash,
    };
    writeLocalUsers([...locals, newUser]);

    const { password_hash: _, ...publicUser } = newUser;
    const localToken = `local_${newUser.id}_${Date.now()}`;
    persistSession(localToken, publicUser);
    set({ user: publicUser, token: localToken, hydrated: true, backendReachable: false });
    return { ok: true };
  },

  signOut: () => {
    clearSession();
    set({ user: null, token: null });
  },
}));
