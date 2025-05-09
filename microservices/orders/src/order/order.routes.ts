import express from 'express';
import { validate } from "@src/middleware/validate";
import * as Validation from './validation';
import * as Handler from './order.handler';
import { verifyJWT } from "@src/middleware/verifyJWT";
import { apiLimiter, sensitiveOperationLimiter } from "@src/middleware/rateLimiter";
import { asyncHandler } from "@src/middleware/errorHandler";

const router = express.Router();

// Wrap all handlers with asyncHandler and apply appropriate rate limiting
router.get('', verifyJWT, apiLimiter, Handler.getAllOrdersHandler);
router.get('/:orderId', verifyJWT, apiLimiter, validate(Validation.getOrderDetailSchema), Handler.getOrderDetailHandler);

// Place order is a sensitive operation that should be rate limited
router.post('', verifyJWT, sensitiveOperationLimiter, validate(Validation.placeOrderSchema), Handler.placeOrderHandler);

// Payment is a sensitive operation that should be rate limited
router.post('/:orderId/pay', sensitiveOperationLimiter, validate(Validation.payOrderSchema), Handler.payOrderHandler);

// Cancellation is a sensitive operation that should be rate limited
router.post('/:orderId/cancel', verifyJWT, sensitiveOperationLimiter, validate(Validation.cancelOrderSchema), Handler.cancelOrderHandler);

export default router;