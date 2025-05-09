import express from 'express';
import { validate } from '@src/middleware/validate';
import * as Validation from './validation';
import * as Handler from './tenant.handler';
import { verifyJWT } from '@src/middleware/verifyJWT';
import { sensitiveOperationLimiter } from '@src/middleware/rateLimiter';

const router = express.Router();

// All tenant operations are sensitive and should have strict rate limiting
router.get('/:tenant_id', verifyJWT, sensitiveOperationLimiter, validate(Validation.getTenantSchema), Handler.getTenantHandler);
router.post('', verifyJWT, sensitiveOperationLimiter, validate(Validation.createTenantSchema), Handler.createTenantHandler);
router.put('/:old_tenant_id', verifyJWT, sensitiveOperationLimiter, validate(Validation.editTenantSchema), Handler.editTenantHandler);
router.delete('', verifyJWT, sensitiveOperationLimiter, validate(Validation.deleteTenantSchema), Handler.deleteTenantHandler);

export default router;