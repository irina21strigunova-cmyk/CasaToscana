import assert from "node:assert/strict";
import test from "node:test";
import {
  OPS_COOKIE_NAME,
  createOpsSessionCookie,
  readOpsSessionCookie,
} from "./session";

test("ops cookie is accepted only for the matching secret", () => {
  process.env.TBANK_OPS_SECRET = "test-ops-secret-value";
  const token = createOpsSessionCookie("test-ops-secret-value");
  assert.ok(token);
  assert.equal(
    readOpsSessionCookie(`${OPS_COOKIE_NAME}=${encodeURIComponent(token as string)}`),
    true
  );
  assert.equal(createOpsSessionCookie("wrong"), null);
  assert.equal(readOpsSessionCookie(`${OPS_COOKIE_NAME}=tampered.token.value`), false);
});
