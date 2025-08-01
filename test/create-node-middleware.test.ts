import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { pino } from "pino";
import { sign } from "@octokit/webhooks-methods";
import { describe, expect, test } from "vitest";

import { createNodeMiddleware, createProbot, Probot } from "../src/index.js";
import type { ApplicationFunction } from "../src/types.js";
import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";
import { MockLoggerTarget } from "./utils.js";

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

describe("createNodeMiddleware", () => {
  test("with createProbot", async () => {
    const onPushCalls: any[] = [];
    const onPush = (event: any) => {
      onPushCalls.push(event);
    };

    const app: ApplicationFunction = (app) => {
      app.on("push", onPush);
    };
    const middleware = await createNodeMiddleware(app, {
      probot: createProbot({
        overrides: {
          log: pino(new MockLoggerTarget()),
        },
        env: {
          APP_ID,
          PRIVATE_KEY,
          WEBHOOK_SECRET,
        },
      }),
    });

    const server = createServer(middleware);

    await new Promise<void>((resolve) => server.listen(resolve));

    const port = (server.address() as any).port;

    const body = JSON.stringify(pushEvent);

    await fetch(`http://localhost:${port}/api/github/webhooks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-github-delivery": "1",
        "x-hub-signature-256": await sign("secret", body),
      },
      body,
    });

    await new Promise<void>((resolve, reject) =>
      server.close((err) => {
        err ? reject(err) : resolve();
      }),
    );

    expect(onPushCalls.length).toBe(1);
    expect(onPushCalls[0].name).toBe("push");
  });

  test("with createProbot and setting the webhookPath via WEBHOOK_PATH to the root", async () => {
    const onPushCalls: any[] = [];
    const onPush = (event: any) => {
      onPushCalls.push(event);
    };

    const app: ApplicationFunction = (app) => {
      app.on("push", onPush);
    };
    const middleware = await createNodeMiddleware(app, {
      probot: createProbot({
        overrides: {
          log: pino(new MockLoggerTarget()),
        },
        env: {
          APP_ID,
          PRIVATE_KEY,
          WEBHOOK_SECRET,
          WEBHOOK_PATH: "/",
        },
      }),
    });

    const server = createServer(middleware);

    await new Promise<void>((resolve) => server.listen(resolve));

    const port = (server.address() as any).port;

    const body = JSON.stringify(pushEvent);

    await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-github-delivery": "1",
        "x-hub-signature-256": await sign("secret", body),
      },
      body,
    });

    await new Promise<void>((resolve, reject) =>
      server.close((err) => {
        err ? reject(err) : resolve();
      }),
    );

    expect(onPushCalls.length).toBe(1);
    expect(onPushCalls[0].name).toBe("push");
  });

  test("with createProbot and setting the webhookPath to the root via the deprecated webhooksPath", async () => {
    const onPushCalls: any[] = [];
    const onPush = (event: any) => {
      onPushCalls.push(event);
    };

    const app: ApplicationFunction = (app) => {
      app.on("push", onPush);
    };
    const middleware = await createNodeMiddleware(app, {
      webhooksPath: "/",
      probot: createProbot({
        overrides: {
          log: pino(new MockLoggerTarget()),
        },
        env: {
          APP_ID,
          PRIVATE_KEY,
          WEBHOOK_SECRET,
        },
      }),
    });

    const server = createServer(middleware);

    await new Promise<void>((resolve) => server.listen(resolve));

    const port = (server.address() as any).port;

    const body = JSON.stringify(pushEvent);

    await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-github-delivery": "1",
        "x-hub-signature-256": await sign("secret", body),
      },
      body,
    });

    await new Promise<void>((resolve, reject) =>
      server.close((err) => {
        err ? reject(err) : resolve();
      }),
    );

    expect(onPushCalls.length).toBe(1);
    expect(onPushCalls[0].name).toBe("push");
  });

  test("loads app only once", async () => {
    let counter = 0;
    const appFn = () => {
      counter++;
    };
    const middleware = await createNodeMiddleware(appFn, {
      probot: new Probot({
        appId: APP_ID,
        privateKey: PRIVATE_KEY,
      }),
    });

    const fakeRequest = {
      url: "/",
    } as IncomingMessage;

    const fakeResponse = {
      writeHead: () => ({ end: () => {} }),
      end: () => ({ writeHead: () => {} }),
    } as unknown as ServerResponse;

    middleware(fakeRequest, fakeResponse);
    middleware(fakeRequest, fakeResponse);

    expect(counter).toBe(1);
  });
});
