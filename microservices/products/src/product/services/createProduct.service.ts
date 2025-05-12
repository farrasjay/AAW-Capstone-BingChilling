// microservices/products/src/product/services/createProduct.service.ts
import { NewProduct } from "@db/schema/products";
import { BadRequestResponse, InternalServerErrorResponse, NotFoundResponse, ServiceUnavailableResponse } from "@src/commons/patterns";
import { createNewProduct } from "../dao/createNewProduct.dao";
import { logger } from "@src/utils/logger";
import { tenantServiceBreaker } from "@src/utils/circuitBreaker";
import { getAllCategoriesByTenantId } from "../dao/getAllCategoriesByTenantId.dao";

export const createProductService = async (
    name: string,
    description: string,
    price: number,
    quantity_available: number,
    category_id?: string,
) => {
    try {
        logger.info(`Creating new product: ${name}, price: ${price}`);
        
        // Validate input data
        if (!name || name.trim().length === 0) {
            logger.warn('Attempted to create product with empty name');
            return new BadRequestResponse('Product name cannot be empty').generate();
        }
        
        if (price < 0) {
            logger.warn(`Attempted to create product with negative price: ${price}`);
            return new BadRequestResponse('Product price cannot be negative').generate();
        }

        if (quantity_available < 0) {
            logger.warn(`Attempted to create product with negative quantity: ${quantity_available}`);
            return new BadRequestResponse('Product quantity cannot be negative').generate();
        }

        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error('Server Tenant ID not found in environment variables');
            return new InternalServerErrorResponse('Server Tenant ID not found').generate();
        }

        // Verify tenant exists (optional, using circuit breaker)
        try {
            const TENANT_MS_URL = process.env.TENANT_MS_URL;
            if (TENANT_MS_URL) {
                logger.debug(`Verifying tenant: ${SERVER_TENANT_ID} exists`);
                
                try {
                    await tenantServiceBreaker.exec(`${TENANT_MS_URL}/tenant/${SERVER_TENANT_ID}`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN || ''}`
                        }
                    });
                    
                    logger.debug('Tenant verification successful');
                } catch (error: unknown) {
                    const tenantError = error as Error;
                    if (tenantError instanceof ServiceUnavailableResponse) {
                        // Circuit is open, log and continue as this is non-critical
                        logger.warn('Tenant service unavailable, continuing with product creation');
                    } else {
                        logger.warn(`Non-critical error checking tenant: ${tenantError.message}`);
                    }
                    // Continue with product creation despite tenant service issues
                }
            }
        } catch (error: unknown) {
            const tenantCheckError = error as Error;
            // Log error but continue - tenant check is non-critical for product creation
            logger.warn(`Error checking tenant: ${tenantCheckError.message}`);
        }

        // If category ID is provided, verify it exists
        if (category_id) {
            try {
                const categories = await getAllCategoriesByTenantId(SERVER_TENANT_ID);
                const categoryExists = categories.some(category => category.id === category_id);
                
                if (!categoryExists) {
                    logger.warn(`Category not found: ${category_id}`);
                    return new NotFoundResponse('Category not found').generate();
                }
                
                logger.debug(`Category verified: ${category_id}`);
            } catch (error: unknown) {
                const categoryError = error as Error;
                logger.error(`Error verifying category: ${categoryError.message}`, { 
                    stack: categoryError.stack,
                    categoryId: category_id 
                });
                return new InternalServerErrorResponse('Error verifying category').generate();
            }
        }

        // Create product data
        const productData: NewProduct = {
            tenant_id: SERVER_TENANT_ID,
            name,
            description,
            price,
            quantity_available,
        };
        
        if (category_id) {
            productData.category_id = category_id;
        }

        // Insert product
        logger.debug(`Inserting new product with data: ${JSON.stringify({
            ...productData,
            description: productData.description ? `${productData.description.substring(0, 20)}...` : undefined
        })}`);
        
        const newProduct = await createNewProduct(productData);

        if (!newProduct) {
            logger.error(`Failed to create product: ${name}`);
            return new InternalServerErrorResponse('Error creating product').generate();
        }

        logger.info(`Product created successfully: ${name}, ID: ${newProduct.id}`);
        return {
            data: newProduct,
            status: 201,
        };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Unexpected error in createProductService: ${err.message}`, { 
            stack: err.stack,
            productName: name,
            price,
            quantity_available
        });
        return new InternalServerErrorResponse(err).generate();
    }
}