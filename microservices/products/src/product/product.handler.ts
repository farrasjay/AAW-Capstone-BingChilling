import { Request, Response } from "express";
import * as Service from './services';
import { asyncHandler } from "@src/middleware/errorHandler";
import { logger } from "@src/utils/logger";

export const getAllProductsHandler = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Fetching all products");
    const response = await Service.getAllProductsService();
    return res.status(response.status).send(response.data);
});

export const getManyProductDatasByIdHandler = asyncHandler(async (req: Request, res: Response) => {
    const { productIds } = req.body;   
    logger.info(`Fetching details for ${productIds.length} products`);
    const response = await Service.getManyProductDatasByIdService(productIds);
    return res.status(response.status).send(response.data);
});

export const getProductByIdHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Fetching product details for id: ${id}`);
    const response = await Service.getProductByIdService(id);
    return res.status(response.status).send(response.data);
});

export const getProductByCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
    const { category_id } = req.params;
    logger.info(`Fetching products for category: ${category_id}`);
    const response = await Service.getProductByCategoryService(category_id);
    return res.status(response.status).send(response.data);
});

export const createProductHandler = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, price, quantity_available, category_id } = req.body;
    logger.info(`Creating new product: ${name}, price: ${price}`);
    const response = await Service.createProductService(name, description, price, quantity_available, category_id);
    return res.status(response.status).send(response.data);
});

export const getAllCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
    logger.info("Fetching all categories");
    const response = await Service.getAllCategoriesService();
    return res.status(response.status).send(response.data);
});

export const createCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    logger.info(`Creating new category: ${name}`);
    const response = await Service.createCategoryService(name);
    return res.status(response.status).send(response.data);
});

export const editProductHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, price, quantity_available, category_id } = req.body;
    logger.info(`Updating product: ${id}`);
    const response = await Service.editProductService(id, name, description, price, quantity_available, category_id);
    return res.status(response.status).send(response.data);
});

export const editCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
    const { category_id } = req.params;
    const { name } = req.body;
    logger.info(`Updating category: ${category_id}`);
    const response = await Service.editCategoryService(category_id, name);
    return res.status(response.status).send(response.data);
});

export const deleteProductHandler = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Deleting product: ${id}`);
    const response = await Service.deleteProductService(id);
    return res.status(response.status).send(response.data);
});

export const deleteCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
    const { category_id } = req.params;
    logger.info(`Deleting category: ${category_id}`);
    const response = await Service.deleteCategoryService(category_id);
    return res.status(response.status).send(response.data);
});