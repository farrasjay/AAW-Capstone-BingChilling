import { InternalServerErrorResponse, ServiceUnavailableResponse } from "@src/commons/patterns";
import { getProductByCategory } from "../dao/getProductByCategory.dao";
import { logger } from "@src/utils/logger";
import { tenantServiceBreaker } from "@src/utils/circuitBreaker";

export const getProductByCategoryService = async (
    category_id: string,
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error('Server tenant ID is missing in environment variables');
            return new InternalServerErrorResponse('Server Tenant ID not found').generate();
        }

        // Optional: Verify category exists through tenant service
        // This demonstrates using circuit breaker for non-essential operations
        try {
            const TENANT_MS_URL = process.env.TENANT_MS_URL;
            if (TENANT_MS_URL) {
                logger.debug(`Verifying tenant: ${SERVER_TENANT_ID} exists`);
                await tenantServiceBreaker.exec(`${TENANT_MS_URL}/tenant/${SERVER_TENANT_ID}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}`
                    }
                });
                logger.debug('Tenant verification successful');
            }
        } catch (error: unknown) {
            const tenantError = error as Error;
            if (tenantError instanceof ServiceUnavailableResponse) {
                // Circuit is open, but we can still continue - this is a non-critical check
                logger.warn('Tenant service unavailable, but continuing with product retrieval');
            } else {
                logger.warn(`Non-critical error checking tenant: ${tenantError.message}`);
            }
            // Continue with the product retrieval even if tenant check fails
        }

        // Get products by category
        logger.info(`Fetching products for category: ${category_id}`);
        const products = await getProductByCategory(SERVER_TENANT_ID, category_id);
        logger.info(`Found ${products.length} products in category: ${category_id}`);

        return {
            data: {
                products,
            },
            status: 200,
        };
    } catch (err: any) {
        logger.error(`Error fetching products by category: ${err.message}`, { 
            stack: err.stack,
            category_id
        });
        return new InternalServerErrorResponse(err).generate();
    }
};