import { getAuthService } from '@/features/auth/auth-service-provider';
import { LoginScreenContent } from '@/features/auth/login-screen';

export default function LoginScreen() {
  return <LoginScreenContent authService={getAuthService()} />;
}
