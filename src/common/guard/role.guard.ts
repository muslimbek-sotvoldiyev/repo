import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

interface RequestWithUser {
    user?: {
        role: string;
    };
}

@Injectable()
export class RoleGuard implements CanActivate {
    constructor(
        private reflector: Reflector
    ) {}
    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>("roles", [
            context.getHandler(),
            context.getClass()
        ]);
        if (!requiredRoles) {
            return true;
        }
        const req = context.switchToHttp().getRequest<RequestWithUser>();
        const user = req.user;

        if (!user || !user.role) {
            return false;
        }

        return requiredRoles.includes(user.role);
    }
}