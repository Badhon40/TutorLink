
import type {
  RegisterInput,
  LoginInput,
} from "./auth.validation";

export type {
  RegisterInput,
  LoginInput,
};

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  role: "STUDENT" | "TUTOR" | "ADMIN";
  isActive: boolean;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
}

export interface AuthSession extends AuthResult {
  refreshToken: string;
}
