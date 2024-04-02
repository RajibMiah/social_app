const jwt = require("jsonwebtoken");

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { authorization } = req.headers as any;
    const token = authorization?.split(" ")[1];
    if (!token) {
      throw new Error("No token provided");
    }

    // Verify the token and extract the payload
    const decodedToken = jwt.verify(token, process.env.TOKEN_KEY) as {
      userId: string;
      isAdmin: boolean;
    };

    // Attach the decoded token payload to a separate property of the request object
    // req.user = {
    //   userId: decodedToken.userId,
    //   isAdmin: decodedToken.isAdmin,
    // };

    return next();

    // Call the next middleware in the chain
    return next();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export default verifyToken;

const optionallyVerifyToken = (req, res, next) => {
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
