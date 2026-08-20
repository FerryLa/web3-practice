import assert from "node:assert/strict";
import test from "node:test";
import { getServerToken, loadMemberConfig, setMemberStatus } from "../src/attributes.js";

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  publisherId: 930170,
  publisherProjectId: 312439,
};

test("loads member administration settings separately from server startup config", () => {
  assert.deepEqual(
    loadMemberConfig({
      XSOLLA_SERVER_CLIENT_ID: "client-id",
      XSOLLA_SERVER_CLIENT_SECRET: "client-secret",
      XSOLLA_PUBLISHER_ID: "930170",
      XSOLLA_PUBLISHER_PROJECT_ID: "312439",
    }),
    config,
  );
});

test("requests a server JWT with the client_credentials grant", async () => {
  const token = await getServerToken({
    ...config,
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://login.xsolla.com/api/oauth2/token");
      assert.equal(options.method, "POST");
      assert.equal(options.body.get("grant_type"), "client_credentials");
      assert.equal(options.body.get("client_id"), "client-id");
      assert.equal(options.body.get("client_secret"), "client-secret");
      return new Response(JSON.stringify({ access_token: "server.jwt.token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  assert.equal(token, "server.jwt.token");
});

test("stores and verifies the read-only webshop_member attribute", async () => {
  const requests = [];
  const attribute = await setMemberStatus({
    userId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    member: true,
    config,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith("/oauth2/token")) {
        return new Response(JSON.stringify({ access_token: "server.jwt.token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/update_read_only")) return new Response(null, { status: 204 });
      return new Response(
        JSON.stringify([
          { key: "webshop_member", value: "true", permission: "private", readonly: true },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  assert.equal(attribute.value, "true");
  assert.equal(requests.length, 3);
  const updateBody = JSON.parse(requests[1].options.body);
  assert.deepEqual(updateBody.attributes, [
    { key: "webshop_member", permission: "private", value: "true" },
  ]);
  assert.equal(updateBody.publisher_id, 930170);
  assert.equal(updateBody.publisher_project_id, 312439);
  assert.equal(requests[1].options.headers["X-SERVER-AUTHORIZATION"], "server.jwt.token");
});
