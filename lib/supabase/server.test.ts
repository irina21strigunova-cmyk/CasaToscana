import assert from "node:assert/strict";
import test from "node:test";
import { describeSupabaseError, isSupabaseConfigured } from "./server";

test("dashboard URL is not a durable store", () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://supabase.com/dashboard/project/abc";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  try {
    assert.equal(isSupabaseConfigured(), false);
  } finally {
    process.env.SUPABASE_URL = previousUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});

test("studio HTML is not forwarded to the buyer", () => {
  const message = describeSupabaseError({
    message: "<!DOCTYPE html><html><title>Supabase</title>Looking for something?",
  });
  assert.equal(message.includes("<!DOCTYPE"), false);
  assert.match(message, /Project URL/);
});
