import { useEffect, useRef } from "react";
import { connectTelemetrySocket, disconnectTelemetrySocket } from "@/services/websocket/telemetrySocket";

export function useTelemetryFeed(onEvent) {
  const callbackRef = useRef(onEvent);
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const socket = connectTelemetrySocket();
    const eventHandler = (payload) => {
      callbackRef.current?.({ ...payload, _channel: "event" });
    };
    const overviewHandler = (payload) => {
      callbackRef.current?.({ ...payload, _channel: "overview" });
    };
    const disconnectHandler = (payload) => {
      callbackRef.current?.({ ...payload, _channel: "disconnect" });
    };
    socket.on("telemetry:event", eventHandler);
    socket.on("telemetry:overview", overviewHandler);
    socket.on("telemetry:disconnect", disconnectHandler);
    return () => {
      socket.off("telemetry:event", eventHandler);
      socket.off("telemetry:overview", overviewHandler);
      socket.off("telemetry:disconnect", disconnectHandler);
      disconnectTelemetrySocket();
    };
  }, []);
}

