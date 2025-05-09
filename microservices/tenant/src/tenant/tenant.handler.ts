import { Request, Response } from "express";
import * as Service from './services';
import { asyncHandler } from "@src/middleware/errorHandler";
import { logger } from "@src/utils/logger";

export const getTenantHandler = asyncHandler(async (req: Request, res: Response) => {
    const { tenant_id } = req.params;
    logger.info(`Fetching tenant details for id: ${tenant_id}`);
    const response = await Service.getTenantService(tenant_id);
    return res.status(response.status).send(response.data);
});

export const createTenantHandler = asyncHandler(async (req: Request, res: Response) => {
    const { name, user } = req.body;
    logger.info(`Creating new tenant: ${name} for user: ${user.id}`);
    const response = await Service.createTenantService(user.id, name);
    return res.status(response.status).send(response.data);
});

export const editTenantHandler = asyncHandler(async (req: Request, res: Response) => {
    const { old_tenant_id } = req.params;
    const { user, tenant_id, owner_id, name } = req.body;
    logger.info(`Updating tenant: ${old_tenant_id}`);
    const response = await Service.editTenantService(old_tenant_id, user, tenant_id, owner_id, name);
    return res.status(response.status).send(response.data);
});

export const deleteTenantHandler = asyncHandler(async (req: Request, res: Response) => {
    const { user, tenant_id } = req.body;
    logger.info(`Deleting tenant: ${tenant_id}`);
    const response = await Service.deleteTenantService(user, tenant_id);
    return res.status(response.status).send(response.data);
});