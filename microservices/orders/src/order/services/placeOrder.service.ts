// microservices/orders/src/order/services/placeOrder.service.ts
import { getAllCartItems } from "@src/cart/dao/getAllCartItems.dao";
import { BadRequestResponse, InternalServerErrorResponse, NotFoundResponse, ServiceUnavailableResponse } from "@src/commons/patterns";
import { createOrder } from "../dao/createOrder.dao";
import { User } from "@type/user";
import { logger } from "@src/utils/logger";
import { productServiceBreaker } from "@src/utils/circuitBreaker";
import { Product } from "@type/product";

export const placeOrderService = async (
    user: User,
    shipping_provider: string,
) => {
    try {
        // Validate tenant ID
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error("Server tenant ID is missing in environment variables");
            return new InternalServerErrorResponse("Server tenant id not found").generate();
        }

        // Validate shipping provider
        if (!['JNE', 'TIKI', 'SICEPAT', 'GOSEND', 'GRAB_EXPRESS'].includes(shipping_provider)) {
            logger.warn(`Invalid shipping provider requested: ${shipping_provider}`);
            return new NotFoundResponse('Shipping provider not found').generate();
        }

        // Validate user ID
        if (!user.id) {
            logger.error("User ID is missing in request");
            return new InternalServerErrorResponse("User id not found").generate();
        }

        // Get cart items
        logger.info(`Fetching cart items for user: ${user.id}`);
        const cartItems = await getAllCartItems(SERVER_TENANT_ID, user.id);

        // Validate cart
        const productIds = cartItems.map((item) => item.product_id);
        if (productIds.length === 0) {
            logger.warn(`Empty cart for user: ${user.id}`);
            return new BadRequestResponse('Cart is empty').generate();
        }

        // Fetch product data using circuit breaker
        let products: Product[];
        try {
            logger.info(`Fetching product data for ${productIds.length} products`);
            const productMsUrl = process.env.PRODUCT_MS_URL;
            
            if (!productMsUrl) {
                logger.error("PRODUCT_MS_URL is missing in environment variables");
                return new InternalServerErrorResponse("Product service URL not configured").generate();
            }
            
            const response = await productServiceBreaker.exec(`${productMsUrl}/product/many`, {
                method: 'POST',
                data: { productIds }
            });
            
            products = response.data;
            
            if (!products || products.length === 0) {
                logger.warn(`No products found for IDs: ${productIds.join(', ')}`);
                return new BadRequestResponse('No products found in cart').generate();
            }
            
            logger.info(`Successfully retrieved ${products.length} products`);
        } catch (error: any) {
            if (error instanceof ServiceUnavailableResponse) {
                // Circuit is open, return service unavailable
                logger.error("Product service is unavailable (circuit open)");
                return new ServiceUnavailableResponse("Product service is temporarily unavailable, please try again later").generate();
            }
            
            logger.error(`Error fetching products: ${error.message}`, { stack: error.stack });
            return new InternalServerErrorResponse("Failed to get products").generate();
        }

        // Create order
        logger.info(`Creating order for user: ${user.id} with ${cartItems.length} items`);
        try {
            const order = await createOrder(
                SERVER_TENANT_ID,
                user.id,
                cartItems,
                products,
                shipping_provider as 'JNE' | 'TIKI' | 'SICEPAT' | 'GOSEND' | 'GRAB_EXPRESS',
            );

            logger.info(`Order created successfully with ID: ${order.order.id}`);
            return {
                data: order,
                status: 201,
            };
        } catch (orderError: any) {
            logger.error(`Error creating order: ${orderError.message}`, { stack: orderError.stack });
            return new InternalServerErrorResponse(orderError).generate();
        }
    } catch (err: any) {
        logger.error(`Unexpected error in placeOrder service: ${err.message}`, { stack: err.stack });
        return new InternalServerErrorResponse(err).generate();
    }
}