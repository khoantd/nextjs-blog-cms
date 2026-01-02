import { UserRole } from "@/lib/types";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
    role: UserRole;
    email: string;
    name: string;
    image: string;
  }
}
