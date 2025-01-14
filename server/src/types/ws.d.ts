import { IncomingMessage } from "http";

export interface WebSocketRequest extends IncomingMessage {
  url: string;
}
