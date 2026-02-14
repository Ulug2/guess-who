import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import React from "react";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger(console.log));

// Supabase client with service role key for admin operations
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Signup endpoint
app.post("/make-server-dd6fd813/signup", async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: "Username and password are required" }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Create a fake email from username since Supabase requires email
    const email = `${username.toLowerCase()}@guesswho.local`;

    // Check if user already exists by checking metadata
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users.some(
      (user) => user.user_metadata?.username === username
    );

    if (userExists) {
      return c.json({ error: "Username already taken" }, 400);
    }

    // Create user with admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      // Automatically confirm the user's email since an email server hasn't been configured
      email_confirm: true,
    });

    if (error) {
      console.error("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({
      user: {
        id: data.user?.id,
        username: data.user?.user_metadata?.username,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return c.json({ error: "Internal server error during signup" }, 500);
  }
});

// Health check
app.get("/make-server-dd6fd813/health", (c) => {
  return c.json({ status: "ok" });
});

Deno.serve(app.fetch);
