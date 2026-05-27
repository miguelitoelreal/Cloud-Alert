import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import { getMonitoringHubUrl } from "../config/env";
import { getStoredAuthSession } from "./authStorage";

export function createMonitoringConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(getMonitoringHubUrl(), {
      accessTokenFactory: () => getStoredAuthSession()?.accessToken ?? "",
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Information)
    .build();
}
