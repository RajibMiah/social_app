import { NextFunction, Request, Response } from "express";

const errorHandler = (
  err: ErrorCallback,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: err });
};

module.exports = { errorHandler };
