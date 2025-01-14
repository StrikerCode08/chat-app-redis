import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const prisma = new PrismaClient();

export const register = async (username: string, password: string) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
    },
  });
  const token = jwt.sign({ userId: user.id }, `${process.env.JWT_SECRET}`, {
    expiresIn: "1h",
  });
  return { user, token };
};

export const login = async (username: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error("User not found");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid password");

  // Create access token
  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "15m",
  });

  // Create refresh token
  const refreshToken = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: crypto.randomBytes(40).toString("hex"),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
    },
  });

  const refreshTokenJWT = jwt.sign(
    { userId: user.id, tokenId: refreshToken.id },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: "8h" }
  );

  return { accessToken, refreshTokenJWT };
};
