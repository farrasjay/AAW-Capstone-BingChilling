import { Request, Response } from "express";
import * as Service from "./services";
import { asyncHandler } from "@src/middleware/errorHandler";
import { logger } from "@src/utils/logger";

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    logger.info(`Login attempt for user: ${username}`);
    const response = await Service.loginService(username, password);
    return res.status(response.status).json(response.data);
});

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, full_name, address, phone_number } = req.body;
    logger.info(`Registration attempt for user: ${username}, email: ${email}`);
    const response = await Service.registerService(username, email, password, full_name, address, phone_number);
    return res.status(response.status).json(response.data);
});

export const verifyTokenHandler = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    logger.debug('Token verification request');
    const response = await Service.verifyTokenService(token);
    return res.status(response.status).json(response.data);
});

export const verifyAdminTokenHandler = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    logger.debug('Admin token verification request');
    const response = await Service.verifyAdminTokenService(token);
    return res.status(response.status).json(response.data);
});