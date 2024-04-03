const jwt = require("jsonwebtoken");
import { Request, Response } from "express";
export {};
const verifyToken = (req: Request, res: Response, next: any) => {
  try {
    const token = req.headers["x-access-token"];

    if (!token) {
      throw new Error("No token provided");
    }

    const { userId, isAdmin } = jwt.verify(token, process.env.TOKEN_KEY);

    req.body = {
      ...req.body,
      userId,
      isAdmin,
    };

    return next();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const optionallyVerifyToken = (req: Request, res: Response, next: any) => {
  try {
    const token = req.headers["x-access-token"];

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.TOKEN_KEY);
    req.body.userId = decoded.userId;

    next();
  } catch (err) {
    return next();
  }
};

module.exports = { verifyToken, optionallyVerifyToken };
