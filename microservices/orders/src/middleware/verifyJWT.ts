import { Request, Response, NextFunction } from "express";
import axios from 'axios';

export const verifyJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(401).send({ message: `Invalid token Bearer: ${token}` });
    }

    const payload = await axios.post(`${process.env.AUTH_MS_URL}/user/verify-token`, { token });
    if (payload.status !== 200) {
      return res.status(401).send({ message: "Invalid token at user/verify-token" });
    }

    req.body.user = payload.data.user;
    next();
  } catch (error) {
    return res.status(401).send({ message: `Invalid token: ${error}` });
  }
};