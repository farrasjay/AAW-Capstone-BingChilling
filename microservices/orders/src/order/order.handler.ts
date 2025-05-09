import { Request, Response } from "express";
import * as Service from "./services";
import { asyncHandler } from "@src/middleware/errorHandler";
import { logger } from "@src/utils/logger";

export const getAllOrdersHandler = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req.body;
    logger.info(`Fetching all orders for user: ${user.id}`);
    const response = await Service.getAllOrdersService(user);
    return res.status(response.status).send(response.data);
});

export const getOrderDetailHandler = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req.body;
    const { orderId } = req.params;
    logger.info(`Fetching order details for order: ${orderId}, user: ${user.id}`);
    const response = await Service.getOrderDetailService(user, orderId);
    return res.status(response.status).send(response.data);
});

export const placeOrderHandler = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req.body;
    const { shipping_provider } = req.body;
    logger.info(`Placing new order for user: ${user.id}, shipping provider: ${shipping_provider}`);
    const response = await Service.placeOrderService(user, shipping_provider);
    return res.status(response.status).send(response.data);
});

export const payOrderHandler = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { payment_method, payment_reference, amount } = req.body;
    logger.info(`Processing payment for order: ${orderId}, amount: ${amount}, method: ${payment_method}`);
    const response = await Service.payOrderService(orderId, payment_method, payment_reference, amount);
    return res.status(response.status).send(response.data);
});

export const cancelOrderHandler = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { user } = req.body;
    logger.info(`Cancelling order: ${orderId} for user: ${user.id}`);
    const response = await Service.cancelOrderService(user, orderId);
    return res.status(response.status).send(response.data);
});