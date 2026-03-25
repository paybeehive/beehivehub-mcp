import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAuthHeader, requireSecretKey } from "../src/auth.js";

describe("auth", () => {
  const ORIGINAL = process.env.SECRET_KEY;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.SECRET_KEY;
    } else {
      process.env.SECRET_KEY = ORIGINAL;
    }
  });

  describe("getAuthHeader", () => {
    it("gera header Basic correto a partir da SECRET_KEY", () => {
      process.env.SECRET_KEY = "sk_test_abc123";
      const header = getAuthHeader();
      const expected = `Basic ${Buffer.from("sk_test_abc123:x").toString("base64")}`;
      expect(header).toBe(expected);
    });

    it("faz trim de espaços na SECRET_KEY antes de codificar", () => {
      process.env.SECRET_KEY = "  sk_test_abc123  ";
      const header = getAuthHeader();
      const expected = `Basic ${Buffer.from("sk_test_abc123:x").toString("base64")}`;
      expect(header).toBe(expected);
    });

    it("lança erro quando SECRET_KEY não está definida", () => {
      delete process.env.SECRET_KEY;
      expect(() => getAuthHeader()).toThrow("SECRET_KEY não configurada");
    });

    it("lança erro quando SECRET_KEY é string vazia", () => {
      process.env.SECRET_KEY = "";
      expect(() => getAuthHeader()).toThrow("SECRET_KEY não configurada");
    });
  });

  describe("requireSecretKey", () => {
    it("não lança quando SECRET_KEY está definida", () => {
      process.env.SECRET_KEY = "sk_test_qualquer";
      expect(() => requireSecretKey()).not.toThrow();
    });

    it("lança quando SECRET_KEY está ausente", () => {
      delete process.env.SECRET_KEY;
      expect(() => requireSecretKey()).toThrow("SECRET_KEY não configurada");
    });
  });
});
