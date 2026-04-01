"use client";

import { useState, useEffect, useCallback } from "react";
import { authApi } from "@/lib/client-api";

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isPremium: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const fetchUser = useCallback(async () => {
    try {
      const res = await authApi.me() as { data: User };
      setState({ user: res.data, loading: false });
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setState({ user: null, loading: false });
      window.location.href = "/";
    }
  }, []);

  return { ...state, refetch: fetchUser, logout };
}
