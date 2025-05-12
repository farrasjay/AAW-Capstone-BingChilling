// microservices/wishlist/src/wishlist/services/createWishlist.service.ts
import { NewWishlist } from "@db/schema/wishlist";
import { BadRequestResponse, ConflictResponse, InternalServerErrorResponse, ServiceUnavailableResponse } from "@src/commons/patterns";
import { createWishlist } from "../dao/createWishlist.dao";
import { User } from "@type/user";
import { logger } from "@src/utils/logger";
import { getAllUserWishlist } from "../dao/getAllUserWishlist.dao";
import { authServiceBreaker } from "@src/utils/circuitBreaker";

export const createWishlistService = async (
    user: User,
    name: string,
) => {
    try {
        logger.info(`Creating new wishlist: ${name} for user: ${user.id}`);

        // Validate input
        if (!name || name.trim().length === 0) {
            logger.warn(`Attempted to create wishlist with empty name for user: ${user.id}`);
            return new BadRequestResponse('Wishlist name cannot be empty').generate();
        }

        if (name.length < 3) {
            logger.warn(`Attempted to create wishlist with name too short: ${name}`);
            return new BadRequestResponse('Wishlist name must be at least 3 characters long').generate();
        }

        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error('Server tenant ID is missing in environment variables');
            return new InternalServerErrorResponse('Server tenant ID is missing').generate();
        }

        if (!user.id) {
            logger.error('User ID is missing in request');
            return new InternalServerErrorResponse('User ID is missing').generate();
        }

        // Optional: Verify user exists using circuit breaker
        try {
            const AUTH_MS_URL = process.env.AUTH_MS_URL;
            const token = process.env.INTERNAL_API_TOKEN;
            
            if (AUTH_MS_URL && token) {
                logger.debug(`Verifying user ${user.id} exists`);
                
                try {
                    await authServiceBreaker.exec(`${AUTH_MS_URL}/user/verify-token`, {
                        method: 'POST',
                        data: { token }
                    });
                    
                    logger.debug('User verification successful');
                } catch (error: unknown) {
                    const authError = error as Error;
                    if (authError instanceof ServiceUnavailableResponse) {
                        // Circuit is open
                        logger.warn('Auth service unavailable, continuing with wishlist creation');
                    } else {
                        logger.warn(`Non-critical error checking user: ${authError.message}`);
                    }
                    // Continue with wishlist creation despite auth service issues
                }
            }
        } catch (error: unknown) {
            const userCheckError = error as Error;
            // Log error but continue - user check is non-critical for wishlist creation
            logger.warn(`Error checking user: ${userCheckError.message}`);
        }

        // Check for duplicate wishlist name for this user
        try {
            const existingWishlists = await getAllUserWishlist(SERVER_TENANT_ID, user.id);
            const duplicateWishlist = existingWishlists.find(
                wishlist => wishlist.name.toLowerCase() === name.toLowerCase()
            );
            
            if (duplicateWishlist) {
                logger.warn(`Wishlist creation failed: Name "${name}" already exists for user: ${user.id}`);
                return new ConflictResponse('Wishlist with this name already exists').generate();
            }
        } catch (error: unknown) {
            const checkError = error as Error;
            logger.error(`Error checking for duplicate wishlists: ${checkError.message}`, {
                stack: checkError.stack,
                userId: user.id
            });
            // Continue with wishlist creation despite check error
            logger.warn('Continuing with wishlist creation despite error checking for duplicates');
        }

        // Create wishlist data
        const wishlistData: NewWishlist = {
            name,
            user_id: user.id,
            tenant_id: SERVER_TENANT_ID,
        };

        // Insert wishlist
        logger.debug(`Inserting new wishlist with data: ${JSON.stringify(wishlistData)}`);
        const wishlist = await createWishlist(wishlistData);

        if (!wishlist) {
            logger.error(`Failed to create wishlist: ${name} for user: ${user.id}`);
            return new InternalServerErrorResponse('Failed to create wishlist').generate();
        }

        logger.info(`Wishlist created successfully: ${name}, ID: ${wishlist.id} for user: ${user.id}`);
        return {
            data: wishlist,
            status: 201,
        };
    } catch (error: unknown) {
        const err = error as Error;
        logger.error(`Unexpected error in createWishlistService: ${err.message}`, { 
            stack: err.stack,
            userId: user?.id,
            wishlistName: name
        });
        return new InternalServerErrorResponse(err).generate();
    }
}