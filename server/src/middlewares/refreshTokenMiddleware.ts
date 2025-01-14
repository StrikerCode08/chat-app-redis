import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as {
      userId: number;
      tokenId: number;
    };

    const refreshToken = await prisma.refreshToken.findFirst({
      where: {
        id: payload.tokenId,
        userId: payload.userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" }
    );

    // Update refresh token expiry
    await prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: {
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      },
    });

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};
