import { sign } from "@octokit/webhooks-methods";
import { ManifestCreation } from "../../src/manifest-creation.js";
import { describe, it, expect } from "vitest";
import getPort from "get-port";
import { type ApplicationFunction, Probot, Server } from "../../src/index.js";
import { pino } from "pino";

import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";
import type { Env } from "../../src/types.js";
import { createDeferredPromise } from "../../src/helpers/create-deferred-promise.js";
import { detectRuntime } from "../../src/helpers/detect-runtime.js";
import { MockLoggerTarget } from "../utils.js";

const UpdateEnvCalls: Env[] = [];
const updateEnv = (env: Env) => {
  UpdateEnvCalls.push(env);
  return env;
};

// @ts-ignore
const smeeClientInstalled = await import("smee-client")
  .then(() => true)
  .catch(() => false);

describe("smee-client", () => {
  delete process.env.WEBHOOK_PROXY_URL;
  const APP_ID = "1";
  const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEA1c7+9z5Pad7OejecsQ0bu3aozN3tihPmljnnudb9G3HECdnH
    lWu2/a1gB9JW5TBQ+AVpum9Okx7KfqkfBKL9mcHgSL0yWMdjMfNOqNtrQqKlN4kE
    p6RD++7sGbzbfZ9arwrlD/HSDAWGdGGJTSOBM6pHehyLmSC3DJoR/CTu0vTGTWXQ
    rO64Z8tyXQPtVPb/YXrcUhbBp8i72b9Xky0fD6PkEebOy0Ip58XVAn2UPNlNOSPS
    ye+Qjtius0Md4Nie4+X8kwVI2Qjk3dSm0sw/720KJkdVDmrayeljtKBx6AtNQsSX
    gzQbeMmiqFFkwrG1+zx6E7H7jqIQ9B6bvWKXGwIDAQABAoIBAD8kBBPL6PPhAqUB
    K1r1/gycfDkUCQRP4DbZHt+458JlFHm8QL6VstKzkrp8mYDRhffY0WJnYJL98tr4
    4tohsDbqFGwmw2mIaHjl24LuWXyyP4xpAGDpl9IcusjXBxLQLp2m4AKXbWpzb0OL
    Ulrfc1ZooPck2uz7xlMIZOtLlOPjLz2DuejVe24JcwwHzrQWKOfA11R/9e50DVse
    hnSH/w46Q763y4I0E3BIoUMsolEKzh2ydAAyzkgabGQBUuamZotNfvJoDXeCi1LD
    8yNCWyTlYpJZJDDXooBU5EAsCvhN1sSRoaXWrlMSDB7r/E+aQyKua4KONqvmoJuC
    21vSKeECgYEA7yW6wBkVoNhgXnk8XSZv3W+Q0xtdVpidJeNGBWnczlZrummt4xw3
    xs6zV+rGUDy59yDkKwBKjMMa42Mni7T9Fx8+EKUuhVK3PVQyajoyQqFwT1GORJNz
    c/eYQ6VYOCSC8OyZmsBM2p+0D4FF2/abwSPMmy0NgyFLCUFVc3OECpkCgYEA5OAm
    I3wt5s+clg18qS7BKR2DuOFWrzNVcHYXhjx8vOSWV033Oy3yvdUBAhu9A1LUqpwy
    Ma+unIgxmvmUMQEdyHQMcgBsVs10dR/g2xGjMLcwj6kn+xr3JVIZnbRT50YuPhf+
    ns1ScdhP6upo9I0/sRsIuN96Gb65JJx94gQ4k9MCgYBO5V6gA2aMQvZAFLUicgzT
    u/vGea+oYv7tQfaW0J8E/6PYwwaX93Y7Q3QNXCoCzJX5fsNnoFf36mIThGHGiHY6
    y5bZPPWFDI3hUMa1Hu/35XS85kYOP6sGJjf4kTLyirEcNKJUWH7CXY+00cwvTkOC
    S4Iz64Aas8AilIhRZ1m3eQKBgQCUW1s9azQRxgeZGFrzC3R340LL530aCeta/6FW
    CQVOJ9nv84DLYohTVqvVowdNDTb+9Epw/JDxtDJ7Y0YU0cVtdxPOHcocJgdUGHrX
    ZcJjRIt8w8g/s4X6MhKasBYm9s3owALzCuJjGzUKcDHiO2DKu1xXAb0SzRcTzUCn
    7daCswKBgQDOYPZ2JGmhibqKjjLFm0qzpcQ6RPvPK1/7g0NInmjPMebP0K6eSPx0
    9/49J6WTD++EajN7FhktUSYxukdWaCocAQJTDNYP0K88G4rtC2IYy5JFn9SWz5oh
    x//0u+zd/R/QRUzLOw4N72/Hu+UG6MNt5iDZFCtapRaKt6OvSBwy8w==
    -----END RSA PRIVATE KEY-----`;
  const WEBHOOK_SECRET = "secret";

  const pushEvent = (
    (WebhookExamples as unknown as WebhookDefinition[]).filter(
      (event) => event.name === "push",
    )[0] as WebhookDefinition<"push">
  ).examples[0];

  it(
    "with createProbot and setting the webhookPath via WEBHOOK_PATH to the root",
    async () => {
      const eventPromise = createDeferredPromise<void>();

      const WEBHOOK_PROXY_URL = await new ManifestCreation({
        updateEnv,
      }).createWebhookChannel();

      expect(WEBHOOK_PROXY_URL).toBeDefined();

      const app: ApplicationFunction = (app) => {
        app.on("push", (event) => {
          try {
            expect(event.name).toBe("push");
            eventPromise.resolve();
          } catch (error) {
            eventPromise.reject(error);
          }
        });
      };

      const port = await getPort();

      const server = new Server({
        Probot: Probot.defaults({
          appId: APP_ID,
          privateKey: PRIVATE_KEY,
          secret: WEBHOOK_SECRET,
        }),
        log: pino(new MockLoggerTarget()),
        port,
        webhookProxy: WEBHOOK_PROXY_URL,
        webhookPath: "/",
      });

      server.load(app);

      await server.start();

      const body = JSON.stringify(pushEvent);

      await fetch(`${WEBHOOK_PROXY_URL}/`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "push",
          "x-github-delivery": "1",
          "x-hub-signature-256": await sign(WEBHOOK_SECRET, body),
        },
        body,
      });

      await eventPromise.promise;

      await server.stop();
    },
    {
      retry: 10,
      timeout: 10000,
      skip: detectRuntime(globalThis) === "deno" || !smeeClientInstalled,
    },
  );
});
