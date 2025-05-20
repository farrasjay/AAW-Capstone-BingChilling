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

    const payload = await axios.post(`${process.env.AUTH_MS_URL}/user/verify-admin-token`, { token });
    if (payload.status !== 200) {
      return res.status(401).send({ message: "Invalid token at user/verify-admin-token" });
    }

    const SERVER_TENANT_ID = process.env.TENANT_ID;
    if (!SERVER_TENANT_ID) {
      return res.status(500).send({ message: "Server Tenant ID not found" });
  }
    const tenantPayload = await axios.get(`${process.env.TENANT_MS_URL}/tenant/${SERVER_TENANT_ID}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (tenantPayload.status !== 200) {
      return res.status(500).send({ message: "Server Tenant not found" });
    }

    // Check for tenant ownership
    if (payload.data.user.id !== tenantPayload.data.tenants.owner_id) {
      return res.status(401).send({ message: `Invalid token: ${payload.data.user.id} != ${tenantPayload.data.tenants.owner_id}` });
    }

    req.body.user = payload.data.user;
    next();
  } catch (error) {
    return res.status(401).send({ message: `Invalid token: ${error}` });
  }
};