import express from 'express';
import { validate } from '@src/middleware/validate';
import * as Validation from './validation';
import * as Handler from './product.handler';
import { verifyJWT } from '@src/middleware/verifyJWT';
import { apiLimiter, sensitiveOperationLimiter } from '@src/middleware/rateLimiter';

const router = express.Router();

// Public endpoints with basic rate limiting
router.get('', apiLimiter, Handler.getAllProductsHandler);
router.get('/category', apiLimiter, Handler.getAllCategoryHandler);
router.get('/:id', apiLimiter, validate(Validation.getProductByIdSchema), Handler.getProductByIdHandler);
router.post('/many', apiLimiter, validate(Validation.getManyProductDatasByIdSchema), Handler.getManyProductDatasByIdHandler);
router.get('/category/:category_id', apiLimiter, validate(Validation.getProductByCategorySchema), Handler.getProductByCategoryHandler);

// Admin operations with stricter rate limiting
router.post('', verifyJWT, sensitiveOperationLimiter, validate(Validation.createProductSchema), Handler.createProductHandler);
router.post('/category', verifyJWT, sensitiveOperationLimiter, validate(Validation.createCategorySchema), Handler.createCategoryHandler);
router.put('/:id', verifyJWT, sensitiveOperationLimiter, validate(Validation.editProductSchema), Handler.editProductHandler);
router.put('/category/:category_id', verifyJWT, sensitiveOperationLimiter, validate(Validation.editCategorySchema), Handler.editCategoryHandler);
router.delete('/:id', verifyJWT, sensitiveOperationLimiter, validate(Validation.deleteProductSchema), Handler.deleteProductHandler);
router.delete('/category/:category_id', verifyJWT, sensitiveOperationLimiter, validate(Validation.deleteCategorySchema), Handler.deleteCategoryHandler);

export default router;