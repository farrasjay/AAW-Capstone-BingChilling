import { NewTenant } from "@db/schema/tenants"
import { InternalServerErrorResponse, ServiceUnavailableResponse } from "@src/commons/patterns"
import { createNewTenant } from "../dao/createNewTenant.dao";
import { logger } from "@src/utils/logger";
import { authServiceBreaker } from "@src/utils/circuitBreaker";

export const createTenantService = async (
    owner_id: string,
    name: string,
) => {
    try {
        // Verify owner exists in auth service before creating tenant
        if (process.env.AUTH_MS_URL) {
            try {
                logger.info(`Verifying user exists before creating tenant: ${owner_id}`);
                
                // Use circuit breaker to verify user exists
                const response = await authServiceBreaker.exec(`${process.env.AUTH_MS_URL}/user/verify-admin-token`, {
                    method: 'POST',
                    data: { token: process.env.INTERNAL_API_TOKEN }
                });
                
                // Check if this user is actually the authenticated user
                if (response.data.user.id !== owner_id) {
                    logger.warn(`User ID mismatch: authenticated as ${response.data.user.id} but attempting to create tenant for ${owner_id}`);
                    return new InternalServerErrorResponse('Permission denied to create tenant for this user').generate();
                }
                
                logger.debug(`User verification successful for ${owner_id}`);
            } catch (authError: any) {
                if (authError instanceof ServiceUnavailableResponse) {
                    // Circuit is open
                    logger.error(`Auth service circuit is open: ${authError.message}`);
                    return new ServiceUnavailableResponse("Authentication service is unavailable, please try again later").generate();
                }
                
                // Other auth errors should prevent tenant creation
                logger.error(`Auth service error: ${authError.message}`, { stack: authError.stack });
                return new InternalServerErrorResponse('Failed to verify user ownership').generate();
            }
        } else {
            logger.warn('AUTH_MS_URL not configured, skipping user verification');
        }

        // Create the tenant
        logger.info(`Creating new tenant with name: ${name} for owner: ${owner_id}`);
        const tenant = await createNewTenant(owner_id, name);
        
        if (!tenant) {
            logger.error(`Failed to create tenant for owner: ${owner_id}`);
            return new InternalServerErrorResponse('Error creating tenant').generate();
        }

        logger.info(`Tenant created successfully with ID: ${tenant.tenants.id}`);
        return {
            data: tenant,
            status: 201,
        };
    } catch (err: any) {
        logger.error(`Error in createTenantService: ${err.message}`, { stack: err.stack });
        return new InternalServerErrorResponse(err).generate();
    }
}