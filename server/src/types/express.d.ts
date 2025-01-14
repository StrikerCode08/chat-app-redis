import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      userId: number;
    }
  }
}

// This is needed to make it a module
export {};
