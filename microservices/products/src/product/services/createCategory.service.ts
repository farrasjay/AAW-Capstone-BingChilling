// microservices/products/src/product/services/createCategory.service.ts
import { NewCategory } from "@db/schema/categories";
import { InternalServerErrorResponse, ConflictResponse, BadRequestResponse } from "@src/commons/patterns";
import { createNewCategory } from "../dao/createNewCategory.dao";
import { logger } from "@src/utils/logger";
import { getAllCategoriesByTenantId } from "../dao/getAllCategoriesByTenantId.dao";

export const createCategoryService = async (
    name: string,
) => {
    try {
        logger.info(`Creating new category: ${name}`);

        if (!name || name.trim().length === 0) {
            logger.warn('Attempted to create category with empty name');
            return new BadRequestResponse('Category name cannot be empty').generate();
        }

        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error('Server Tenant ID not found in environment variables');
            return new InternalServerErrorResponse('Server Tenant ID not found').generate();
        }

        // Check for duplicate category name
        try {
            const existingCategories = await getAllCategoriesByTenantId(SERVER_TENANT_ID);
            const duplicateCategory = existingCategories.find(
                category => category.name.toLowerCase() === name.toLowerCase()
            );

            if (duplicateCategory) {
                logger.warn(`Category creation failed: Name "${name}" already exists`);
                return new ConflictResponse('Category with this name already exists').generate();
            }
        } catch (checkError) {
            logger.error(`Error checking for duplicate categories: ${checkError.message}`, {
                stack: checkError.stack
            });
            // Continue with category creation despite the check error
            logger.warn('Continuing with category creation despite error checking for duplicates');
        }

        // Create category
        const categoryData: NewCategory = {
            tenant_id: SERVER_TENANT_ID,
            name,
        };
        
        logger.debug(`Inserting new category with data: ${JSON.stringify(categoryData)}`);
        const newCategory = await createNewCategory(categoryData);

        if (!newCategory) {
            logger.error(`Failed to create category: ${name}`);
            return new InternalServerErrorResponse('Error creating category').generate();
        }

        logger.info(`Category created successfully: ${name}, ID: ${newCategory.id}`);
        return {
            data: {
                ...newCategory,
            },
            status: 201,
        };
    } catch (err) {
        logger.error(`Unexpected error in createCategoryService: ${err.message}`, { 
            stack: err.stack,
            categoryName: name
        });
        return new InternalServerErrorResponse(err).generate();
    }
}