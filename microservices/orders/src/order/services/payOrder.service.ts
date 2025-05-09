import { BadRequestResponse, InternalServerErrorResponse, NotFoundResponse, ServiceUnavailableResponse } from "@src/commons/patterns";
import { NewPayment } from "@db/schema/payment";
import { payOrder } from "../dao/payOrder.dao";
import { logger } from "@src/utils/logger";
import { productServiceBreaker } from "@src/utils/circuitBreaker";
import { getOrderById } from "../dao/getOrderById.dao";
import { getOrderDetail } from "../dao/getOrderDetail.dao";

export const payOrderService = async (
    orderId: string,
    payment_method: string,
    payment_reference: string,
    amount: number
) => {
    try {
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error("Server tenant ID is missing in environment variables");
            return new InternalServerErrorResponse("Server tenant id not found").generate();
        }

        // First get order data to verify it exists
        logger.info(`Verifying order: ${orderId} exists before payment`);
        const order = await getOrderById(SERVER_TENANT_ID, "", orderId);
        
        if (!order) {
            logger.warn(`Order not found for payment: ${orderId}`);
            return new NotFoundResponse("Order not found").generate();
        }
        
        if (order.order_status !== 'PENDING') {
            logger.warn(`Invalid order status for payment: ${order.order_status}`);
            return new BadRequestResponse(`Order is already ${order.order_status}`).generate();
        }

        // Optional: Verify products in order still exist and are available
        try {
            // Get order details
            const orderDetails = await getOrderDetail(SERVER_TENANT_ID, orderId);
            if (orderDetails) {
                const productIds = [orderDetails.product_id];
                
                // Use circuit breaker to check products
                const PRODUCT_MS_URL = process.env.PRODUCT_MS_URL;
                if (PRODUCT_MS_URL) {
                    logger.debug(`Verifying products exist for order: ${orderId}`);
                    
                    try {
                        await productServiceBreaker.exec(`${PRODUCT_MS_URL}/product/many`, {
                            method: 'POST',
                            data: { productIds }
                        });
                        
                        logger.debug('Product verification successful');
                    } catch (productError) {
                        if (productError instanceof ServiceUnavailableResponse) {
                            // Circuit is open, but we can still continue with the payment
                            // as this is a non-critical check
                            logger.warn('Product service unavailable, but continuing with payment processing');
                        } else {
                            logger.warn(`Non-critical error checking products: ${productError.message}`);
                        }
                        // Continue with payment even if product check fails
                    }
                }
            }
        } catch (checkError) {
            // Log but continue - this is a non-critical check
            logger.warn(`Error checking products for order ${orderId}: ${checkError.message}`);
        }

        // Create payment data
        const paymentData: NewPayment = {
            tenant_id: SERVER_TENANT_ID,
            order_id: orderId,
            payment_method,
            payment_reference,
            amount,
        };

        // Process payment
        logger.info(`Processing payment for order: ${orderId}, amount: ${amount}`);
        const payment = await payOrder(paymentData);

        if (!payment) {
            logger.error(`Payment processing failed for order: ${orderId}`);
            return new InternalServerErrorResponse("Payment processing failed").generate();
        }

        logger.info(`Payment processed successfully for order: ${orderId}`);
        return {
            data: payment,
            status: 200,
        };
    } catch (err: any) {
        if (err.message === 'Rollback') {
            logger.warn(`Payment amount does not match order total amount for order: ${orderId}`);
            return new BadRequestResponse("Payment amount does not match order total amount").generate();
        }

        logger.error(`Error processing payment for order ${orderId}: ${err.message}`, {
            stack: err.stack,
            payment_method,
            amount
        });
        return new InternalServerErrorResponse(err).generate();
    }
}