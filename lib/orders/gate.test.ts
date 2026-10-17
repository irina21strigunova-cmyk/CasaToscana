import assert from "node:assert/strict";
import test from "node:test";
import { unpaidOrdersEnabled } from "./store";

test("unpaid CDEK checkout stays closed without Supabase", () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(unpaidOrdersEnabled(), false);
});
