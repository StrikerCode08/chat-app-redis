import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(req);

  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, `${process.env.JWT_SECRET}`) as {
      userId: number;
    };
    req.userId = payload.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};
