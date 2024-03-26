import { NextFunction, Request, Response } from "express";
const jwt = require("jsonwebtoken");
const checkLogin = (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.header as any;
  try {
    const token = authorization.split(" ")[1];
    const { username, user_id } = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    console.log("check function error:", error);
    next("Authontication failure");
  }
};

module.exports = checkLogin;
