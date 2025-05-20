import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

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

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    const { id, tenant_id } = payload;
    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return res.status(500).send({ message: "Server tenant ID is missing" });
    }
    if (tenant_id !== process.env.TENANT_ID) {
      return res.status(401).send({ message: `Invalid token: ${tenant_id} != ${process.env.TENANT_ID}` });
    }

    req.body.user = payload;
    next();
  } catch (error) {
    return res.status(401).send({ message: `Invalid token: ${error}` });
  }
};