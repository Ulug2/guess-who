import { useState } from "react";
import { LogIn, UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import React from "react";

interface AuthScreenProps {
  onAuthSuccess: (userId: string, username: string) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login flow
        const email = `${username.toLowerCase()}@guesswho.local`;
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError("Invalid username or password");
          setIsLoading(false);
          return;
        }

        if (data.user) {
          onAuthSuccess(data.user.id, data.user.user_metadata.username);
        }
      } else {
        // Signup flow (client-side – no Edge Function required)
        const email = `${username.toLowerCase().trim()}@guesswho.local`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.trim() },
            emailRedirectTo: undefined,
          },
        });

        if (signUpError) {
          if (signUpError.message?.toLowerCase().includes("already registered") || signUpError.message?.toLowerCase().includes("already exists")) {
            setError("Username already taken. Try logging in.");
          } else {
            setError(signUpError.message || "Signup failed");
          }
          setIsLoading(false);
          return;
        }

        // If Supabase has "Confirm email" disabled, we get a session and can sign in immediately
        if (signUpData.session && signUpData.user) {
          const name = signUpData.user.user_metadata?.username ?? username.trim();
          onAuthSuccess(signUpData.user.id, name);
          setIsLoading(false);
          return;
        }

        // No session = email confirmation is required (fake email can't confirm)
        if (signUpData.user && !signUpData.session) {
          setError(
            "Account created but email confirmation is on. In Supabase Dashboard go to Authentication → Providers → Email and turn off “Confirm email” so you can sign in with username only."
          );
          setIsLoading(false);
          return;
        }

        setError("Signup failed. Try again.");
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-6xl font-bold text-white mb-4">Guess Who?</h1>
          <div className="h-1.5 w-32 bg-gradient-to-r from-[#8B0000] via-[#FFD700] to-[#8B0000] mx-auto rounded-full"></div>
          <p className="text-gray-400 mt-4">
            Challenge friends in the classic guessing game
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-gray-900 rounded-3xl shadow-2xl border-2 border-[#FFD700] p-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Toggle Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${isLogin
                ? "bg-gradient-to-r from-[#8B0000] to-[#B22222] text-white"
                : "text-gray-400 hover:text-white"
                }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError("");
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${!isLogin
                ? "bg-gradient-to-r from-[#8B0000] to-[#B22222] text-white"
                : "text-gray-400 hover:text-white"
                }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full bg-gray-800 border-2 border-gray-700 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  minLength={6}
                  className="w-full bg-gray-800 border-2 border-gray-700 focus:border-[#FFD700] rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-gray-400 text-xs mt-1">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFC107] hover:from-[#FFE135] hover:to-[#FFD700] disabled:from-gray-700 disabled:to-gray-700 text-[#8B0000] disabled:text-gray-500 py-4 rounded-xl font-bold text-lg transition-all duration-200 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[56px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Please wait...</span>
                </>
              ) : isLogin ? (
                <>
                  <LogIn size={20} />
                  <span>Login</span>
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Info Text */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-[#FFD700] hover:text-[#FFE135] font-semibold transition-colors"
              >
                {isLogin ? "Sign up" : "Login"}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>Guess Who — challenge friends</p>
        </div>
      </div>
    </div>
  );
}
