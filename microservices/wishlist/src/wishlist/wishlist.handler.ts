import { Request, Response } from "express";
import * as Service from './services';
import { asyncHandler } from "@src/middleware/errorHandler";
import { logger } from "@src/utils/logger";

export const getAllUserWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req.body;
    logger.info(`Fetching all wishlists for user: ${user.id}`);
    const response = await Service.getAllUserWishlistService(user);
    return res.status(response.status).send(response.data);
});

export const getWishlistByIdHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user } = req.body;
    logger.info(`Fetching wishlist: ${id} for user: ${user.id}`);
    const response = await Service.getWishlistByIdService(id, user);
    return res.status(response.status).send(response.data);
});

export const createWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
    const { user, name } = req.body;
    logger.info(`Creating new wishlist: ${name} for user: ${user.id}`);
    const response = await Service.createWishlistService(user, name);
    return res.status(response.status).send(response.data);
});

export const updateWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    logger.info(`Updating wishlist: ${id}`);
    const response = await Service.updateWishlistService(id, name);
    return res.status(response.status).send(response.data);
});

export const deleteWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Deleting wishlist: ${id}`);
    const response = await Service.deleteWishlistService(id);
    return res.status(response.status).send(response.data);
});

export const addProductToWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
    const { user, wishlist_id, product_id } = req.body;
    logger.info(`Adding product: ${product_id} to wishlist: ${wishlist_id} for user: ${user.id}`);
    const response = await Service.addProductToWishlistService(wishlist_id, product_id, user);
    return res.status(response.status).send(response.data);
});

export const removeProductFromWishlistHandler = asyncHandler(async (req: Request, res: Response) => {
    const { user, id } = req.body;
    logger.info(`Removing product from wishlist with detail id: ${id} for user: ${user.id}`);
    const response = await Service.removeProductFromWishlistService(id, user);
    return res.status(response.status).send(response.data);
});