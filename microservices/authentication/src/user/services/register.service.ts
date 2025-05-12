import bcrypt from 'bcrypt';
import { NewUser } from '@db/schema/users';
import { insertNewUser } from '../dao/insertNewUser.dao';
import { ConflictResponse, InternalServerErrorResponse } from '@src/commons/patterns';
import { logger } from '@src/utils/logger';
import { getUserByUsername } from '../dao/getUserByUsername.dao';

export const registerService = async (
    username: string,
    email: string,
    password: string,
    full_name: string,
    address: string,
    phone_number: string
) => {
    try {
        logger.info(`Registration attempt for user: ${username}, email: ${email}`);

        // Validate server tenant ID
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            logger.error('Server tenant ID is missing in environment variables');
            return new InternalServerErrorResponse("Server tenant ID is missing").generate();
        }

        // Check if username already exists
        try {
            const existingUser = await getUserByUsername(username, SERVER_TENANT_ID);
            if (existingUser) {
                logger.warn(`Registration failed: Username ${username} already exists`);
                return new ConflictResponse("Username already exists").generate();
            }
        } catch (error: unknown) {
            // Type guard for the error object
            const dbError = error as Error;
            logger.error(`Database error while checking existing username: ${dbError.message}`, { 
                stack: dbError.stack, 
                username 
            });
            return new InternalServerErrorResponse("Error checking username availability").generate();
        }

        // Hash password
        try {
            logger.debug('Hashing password');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user data object
            const userData: NewUser = {
                tenant_id: SERVER_TENANT_ID,
                username,
                email,
                password: hashedPassword,
                full_name,
                address,
                phone_number
            };

            // Insert new user
            logger.debug(`Inserting new user: ${username}`);
            const newUser = await insertNewUser(userData);

            if (!newUser || newUser.length === 0) {
                logger.error(`Failed to create user: ${username}`);
                return new InternalServerErrorResponse("Failed to create user").generate();
            }

            logger.info(`User registered successfully: ${username}, ID: ${newUser[0].id}`);
            return {
                data: {
                    id: newUser[0].id,
                    username: newUser[0].username,
                    email: newUser[0].email,
                    full_name: newUser[0].full_name,
                    address: newUser[0].address,
                    phone_number: newUser[0].phone_number
                },
                status: 201
            };
        } catch (error: unknown) {
            // Type guard for the error object
            const err = error as Error;
            logger.error(`Error hashing password or creating user: ${err.message}`, { stack: err.stack });
            return new InternalServerErrorResponse(err.message).generate();
        }
    } catch (error: unknown) {
        // Type guard for the error object
        const err = error as Error;
        logger.error(`Unexpected error in registerService: ${err.message}`, { stack: err.stack });
        return new InternalServerErrorResponse(err.message).generate();
    }
}