import { Request, Response } from "express";
import { register, login } from "../services/authService";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const { user, token } = await register(username, password);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const { accessToken, refreshTokenJWT } = await login(username, password);

    res.cookie("token", accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      domain:
        process.env.NODE_ENV === "production"
          ? process.env.DOMAIN
          : "localhost",
    });

    res.cookie("refreshToken", refreshTokenJWT, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({ token: accessToken });
  } catch (error) {
    res.status(400).json({ error });
  }
};

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      ) as {
        tokenId: number;
      };
      await prisma.refreshToken.delete({ where: { id: payload.tokenId } });
    } catch (error) {
      // Ignore token verification errors during logout
    }
  }
  res.clearCookie("token");
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logged out successfully" });
};
