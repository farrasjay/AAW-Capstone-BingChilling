import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from './validation';
import * as Handler from './wishlist.handler';
import { verifyJWT } from "@src/middleware/verifyJWT";
import { apiLimiter } from "@src/middleware/rateLimiter";

const router = express.Router();

// Apply API rate limiting to all wishlist operations
router.get('/', verifyJWT, apiLimiter, Handler.getAllUserWishlistHandler);
router.get('/:id', verifyJWT, apiLimiter, validate(Validation.getWishlistByIdSchema), Handler.getWishlistByIdHandler);
router.post('/', verifyJWT, apiLimiter, validate(Validation.createWishlistSchema), Handler.createWishlistHandler);
router.put('/:id', verifyJWT, apiLimiter, validate(Validation.updateWishlistSchema), Handler.updateWishlistHandler);
router.delete('/remove', verifyJWT, apiLimiter, validate(Validation.removeProductFromWishlistSchema), Handler.removeProductFromWishlistHandler);
router.delete('/:id', verifyJWT, apiLimiter, validate(Validation.deleteWishlistSchema), Handler.deleteWishlistHandler);
router.post('/add', verifyJWT, apiLimiter, validate(Validation.addProductToWishlistSchema), Handler.addProductToWishlistHandler);

export default router;