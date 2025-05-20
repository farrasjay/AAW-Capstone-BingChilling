import { InternalServerErrorResponse, UnauthorizedResponse } from "@src/commons/patterns";
import jwt, { JwtPayload } from "jsonwebtoken";
import { getUserById } from "../dao/getUserById.dao";

export const verifyAdminTokenService = async (
    token: string
) => {
    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as JwtPayload;

        const { id, tenant_id } = payload;
        const SERVER_TENANT_ID = process.env.TENANT_ID;
        if (!SERVER_TENANT_ID) {
            return new InternalServerErrorResponse("Server tenant ID is missing").generate();
        }
        if (tenant_id !== SERVER_TENANT_ID) {
            return new UnauthorizedResponse("Invalid token").generate();
        }

        const user = await getUserById(id, SERVER_TENANT_ID);
        if (!user) {
            return new UnauthorizedResponse("Invalid token").generate();
        }

        return {
            data: {
                user,
            },
            status: 200
        }
    } catch (err: any) {
        return new UnauthorizedResponse("Invalid token").generate();
    }
}