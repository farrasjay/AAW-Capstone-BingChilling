import { NewWishlistDetail } from "@db/schema/wishlistDetail";
import { InternalServerErrorResponse, NotFoundResponse, ServiceUnavailableResponse } from "@src/commons/patterns";
import { addProductToWishlist } from "../dao/addProductToWishlist.dao";
import { getWishlistById } from "../dao/getWishlistById.dao";
import { User } from "@type/user";
import { logger } from "@src/utils/logger";
import { productServiceBreaker } from "@src/utils/circuitBreaker";

export const addProductToWishlistService = async (
    wishlist_id: string,
    product_id: string,
    user: User,
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error('Server tenant ID is missing in environment variables');
            return new InternalServerErrorResponse('Server tenant ID is missing').generate();
        }

        if (!user.id) {
            logger.error('User ID is missing in request');
            return new InternalServerErrorResponse('User ID is missing').generate();
        }

        // Verify wishlist exists and belongs to user
        logger.info(`Verifying wishlist ${wishlist_id} for user ${user.id}`);
        const wishlist = await getWishlistById(SERVER_TENANT_ID, wishlist_id);
        if (!wishlist) {
            logger.warn(`Wishlist not found: ${wishlist_id}`);
            return new NotFoundResponse('Wishlist not found').generate();
        }

        if (wishlist.user_id !== user.id) {
            logger.warn(`User ${user.id} is not authorized to add product to wishlist ${wishlist_id}`);
            return new InternalServerErrorResponse('User is not authorized to add product to this wishlist').generate();
        }

        // Verify the product exists using circuit breaker
        try {
            const PRODUCT_MS_URL = process.env.PRODUCT_MS_URL;
            if (PRODUCT_MS_URL) {
                logger.debug(`Verifying product ${product_id} exists`);
                
                await productServiceBreaker.exec(`${PRODUCT_MS_URL}/product/${product_id}`, {
                    method: 'GET'
                });
                
                logger.debug(`Product ${product_id} verified successfully`);
            } else {
                logger.warn('PRODUCT_MS_URL not configured, skipping product verification');
            }
        } catch (productError: any) {
            if (productError instanceof ServiceUnavailableResponse) {
                // Circuit is open, we can still add to wishlist as this is a non-critical check
                logger.warn(`Product service unavailable, continuing with wishlist addition: ${productError.message}`);
            } else if (productError.response && productError.response.status === 404) {
                // Product does not exist
                logger.warn(`Product ${product_id} not found`);
                return new NotFoundResponse('Product not found').generate();
            } else {
                // Log the error but continue
                logger.warn(`Error verifying product: ${productError.message}`, { stack: productError.stack });
            }
        }

        // Add product to wishlist
        const wishlistDetailData: NewWishlistDetail = {
            product_id,
            wishlist_id,
        };

        logger.info(`Adding product ${product_id} to wishlist ${wishlist_id}`);
        const wishlistDetail = await addProductToWishlist(wishlistDetailData);

        if (!wishlistDetail) {
            logger.error(`Failed to add product ${product_id} to wishlist ${wishlist_id}`);
            return new InternalServerErrorResponse('Failed to add product to wishlist').generate();
        }

        logger.info(`Product ${product_id} added to wishlist ${wishlist_id} successfully`);
        return {
            data: wishlistDetail,
            status: 201,
        };
    } catch (err: any) {
        logger.error(`Error adding product to wishlist: ${err.message}`, { stack: err.stack });
        return new InternalServerErrorResponse(err).generate();
    }
}