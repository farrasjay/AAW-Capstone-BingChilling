import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getUserByUsername } from '../dao/getUserByUsername.dao';
import { InternalServerErrorResponse, NotFoundResponse, UnauthenticatedResponse } from "@src/commons/patterns";
import { User } from '@db/schema/users';
import { logger } from '@src/utils/logger';

export const loginService = async (
    username: string,
    password: string
) => {
    try {
        // Check for server tenant ID
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error('Server tenant ID is missing in environment variables');
            return new InternalServerErrorResponse("Server tenant ID is missing").generate();
        }
        
        // Fetch user data
        try {
            const user: User = await getUserByUsername(
                username,
                SERVER_TENANT_ID,
            );
            
            // User not found
            if (!user) {
                logger.warn(`Login failed: User not found - ${username}`);
                return new NotFoundResponse("Invalid username or password").generate();
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                logger.warn(`Login failed: Invalid password for user - ${username}`);
                return new UnauthenticatedResponse("Invalid username or password").generate();
            }

            // Generate JWT token
            const payload = {
                id: user.id,
                tenant_id: user.tenant_id,
            }
            
            const secret: string = process.env.JWT_SECRET as string;
            if (!secret) {
                logger.error('JWT_SECRET is missing in environment variables');
                return new InternalServerErrorResponse("JWT Secret is not configured").generate();
            }
            
            const token = jwt.sign(payload, secret, {
                expiresIn: "1d",
            });

            logger.info(`User logged in successfully: ${username}`);
            return {
                data: {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                    }
                },
                status: 200
            }
        } catch (dbError: any) {
            logger.error(`Database error while fetching user: ${dbError.message}`, { stack: dbError.stack });
            return new InternalServerErrorResponse("Database error").generate();
        }
    } catch (err: any) {
        logger.error(`Unexpected error in login service: ${err.message}`, { stack: err.stack });
        return new InternalServerErrorResponse(err).generate();
    }
}