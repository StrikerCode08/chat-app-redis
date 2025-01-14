import { PrismaClient } from "@prisma/client";

class PrismaInstance {
  private static instance: PrismaClient;

  public static getInstance(): PrismaClient {
    if (!PrismaInstance.instance) {
      PrismaInstance.instance = new PrismaClient();
    }
    return PrismaInstance.instance;
  }
}

export const prisma = PrismaInstance.getInstance();
