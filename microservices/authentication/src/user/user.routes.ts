import express from "express";
import { validate } from "@src/middleware/validate";
import * as Validation from "./validation";
import * as Handler from "./user.handler";
import { authLimiter, createAccountLimiter } from "@src/middleware/rateLimiter";

const router = express.Router();

// Apply rate limits to sensitive endpoints
router.post("/register", createAccountLimiter, validate(Validation.registerSchema), Handler.registerHandler);
router.post("/login", authLimiter, validate(Validation.loginSchema), Handler.loginHandler);
router.post("/verify-token", authLimiter, validate(Validation.verifyTokenSchema), Handler.verifyTokenHandler);
router.post("/verify-admin-token", authLimiter, validate(Validation.verifyAdminTokenSchema), Handler.verifyAdminTokenHandler);

export default router;