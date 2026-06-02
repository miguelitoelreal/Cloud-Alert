import { beforeEach, describe, expect, it, vi } from "vitest";
import { authSession } from "./authTestData";
import { setStoredAuthSession } from "../src/services/authStorage";

const withUrl = vi.fn();
const withAutomaticReconnect = vi.fn();
const configureLogging = vi.fn();
const build = vi.fn();

describe("createMonitoringConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    withUrl.mockReturnThis();
    withAutomaticReconnect.mockReturnThis();
    configureLogging.mockReturnThis();
    build.mockReturnValue({});
  });

  it("configura SignalR con accessTokenFactory basado en la sesión JWT actual", async () => {
    vi.doMock("@microsoft/signalr", () => {
      function HubConnectionBuilder() {
        return {
          withUrl,
          withAutomaticReconnect,
          configureLogging,
          build,
        };
      }

      return {
        HubConnectionBuilder,
        LogLevel: {
          Information: 2,
        },
      };
    });

    setStoredAuthSession(authSession);
    const { createMonitoringConnection } = await import("../src/services/signalr");

    createMonitoringConnection();

    expect(withUrl).toHaveBeenCalledTimes(1);
    const [, options] = withUrl.mock.calls[0];
    expect(options.accessTokenFactory()).toBe(authSession.accessToken);
  });
});
