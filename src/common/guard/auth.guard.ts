import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

interface JwtPayload {
    email: string;
    role: string;
    [key: string]: any;
}

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly userService: UsersService) { }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<{
            headers: { authorization?: string };
            user?: any;
        }>();
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new UnauthorizedException("token yoq");
        }
        const token = authHeader.split(" ")[1];
        if (!token) {throw new UnauthorizedException("JWT kalit topilmadi");}
        try {
            const secretKey = this.configService.get<string>("JWT_ACCESS_TOKEN");
            const decodedToken = this.jwtService.verify<JwtPayload>(token, {
                secret: secretKey,
            });
            if (!decodedToken || !decodedToken.email) {
                throw new UnauthorizedException("Foydalanuvchi ma'lumotlari topilmadi");
            }
            const user = await this.userService.findByEmail(decodedToken.email);
            if (!user) {
                throw new UnauthorizedException("Bunday foydalanuvchi bazada mavjud emas");
            }
            request.user = user;
            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException("yaroqsiz yoki muddati o'tgan token");
        }
    }
}