import { Request, Response } from "express";
import { register, login } from "../services/authService";

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
    const token = await login(username, password);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });
    res.status(200).json({ token });
  } catch (error) {
    res.status(400).json({ error });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};
