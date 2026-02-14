// import React from "react";  
import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { ensureProfile } from "../lib/profiles";
import { AuthScreen } from "./AuthScreen";

export function AuthWrapper() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const setUserFromSession = (session: { user: { id: string; user_metadata?: { username?: string } } } | null) => {
    if (!session?.user) {
      setUser(null);
      return;
    }
    const username = session.user.user_metadata?.username ?? "user";
    setUser({ id: session.user.id, username });
    ensureProfile(session.user.id, username).catch(console.error);
  };

  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUserFromSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const username = session.user.user_metadata?.username ?? "user";
        setUser({ id: session.user.id, username });
        await ensureProfile(session.user.id, username);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Session check error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = (userId: string, username: string) => {
    setUser({ id: userId, username });
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return <Outlet context={{ user }} />;
}
