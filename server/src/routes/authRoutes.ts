import { Router } from "express";
import { registerUser, loginUser } from "../controllers/authControllers";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const payload = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as {
      userId: number;
      tokenId: number;
    };

    const token = await prisma.refreshToken.findFirst({
      where: {
        id: payload.tokenId,
        userId: payload.userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new tokens
    const accessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" }
    );

    // Update refresh token expiry
    await prisma.refreshToken.update({
      where: { id: token.id },
      data: {
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });

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

    res.json({ token: accessToken });
  } catch (error) {
    console.log(req);

    res.status(401).json({ message: "Invalid refresh token" });
  }
});

export default router;
