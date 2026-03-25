import { describe, it, expect, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { validateAuth, unauthorized } from "../src/transports/auth-middleware.js";

function makeReq(authorizationHeader?: string): IncomingMessage {
  return {
    headers: authorizationHeader
      ? { authorization: authorizationHeader }
      : {},
  } as unknown as IncomingMessage;
}

function makeRes() {
  const res = {
    writeHead: vi.fn(),
    end: vi.fn(),
  };
  return res as unknown as ServerResponse;
}

describe("validateAuth", () => {
  it("retorna true quando authToken não está definido (modo sem auth)", () => {
    const req = makeReq();
    expect(validateAuth(req, undefined)).toBe(true);
  });

  it("retorna true quando header Bearer corresponde ao token", () => {
    const req = makeReq("Bearer meu-token-secreto");
    expect(validateAuth(req, "meu-token-secreto")).toBe(true);
  });

  it("retorna false quando header Bearer é diferente do token", () => {
    const req = makeReq("Bearer token-errado");
    expect(validateAuth(req, "meu-token-secreto")).toBe(false);
  });

  it("retorna false quando header Authorization está ausente e token está definido", () => {
    const req = makeReq();
    expect(validateAuth(req, "meu-token-secreto")).toBe(false);
  });

  it("retorna false quando header usa esquema diferente de Bearer", () => {
    const req = makeReq("Basic meu-token-secreto");
    expect(validateAuth(req, "meu-token-secreto")).toBe(false);
  });
});

describe("unauthorized", () => {
  it("responde com status 401 e body JSON de erro", () => {
    const res = makeRes();
    unauthorized(res);

    expect(res.writeHead).toHaveBeenCalledWith(
      401,
      expect.objectContaining({
        "Content-Type": "application/json",
        "WWW-Authenticate": expect.stringContaining("Bearer"),
      })
    );
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "Unauthorized. Provide a valid Bearer token." })
    );
  });
});
