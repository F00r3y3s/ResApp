import { router } from 'expo-router';
import { ArrowLeft, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';

import type { AuthService } from './auth-service';

type LoginScreenContentProps = {
  authService: AuthService | null;
};

type AuthMode = 'email' | 'otp-sent' | 'password';

export function LoginScreenContent({ authService }: LoginScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSendOtp() {
    if (!authService) {
      setErrorMessage('Authentication is not configured. Continue as guest.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await authService.signInWithOtp(email.trim());

    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    setSuccessMessage('Check your email for a sign-in code.');
    setMode('otp-sent');
  }

  async function handleVerifyOtp() {
    if (!authService) return;

    if (!otpCode.trim()) {
      setErrorMessage('Please enter the code from your email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await authService.verifyOtp(email.trim(), otpCode.trim());

    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    router.replace('/');
  }

  async function handlePasswordAuth() {
    if (!authService) {
      setErrorMessage('Authentication is not configured. Continue as guest.');
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Try sign in first, fall back to sign up
    const signInResult = await authService.signInWithPassword(email.trim(), password);

    if (signInResult.success) {
      setIsLoading(false);
      router.replace('/');
      return;
    }

    // If sign-in failed, try creating an account
    const signUpResult = await authService.signUp(email.trim(), password);

    setIsLoading(false);

    if (!signUpResult.success) {
      setErrorMessage(signUpResult.error);
      return;
    }

    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 48) }]}
        keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={24} stroke={KitchenDesign.colors.ink} />
        </Pressable>

        <Text style={styles.title}>
          {mode === 'otp-sent' ? 'Enter your code' : 'Sign in or create account'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'otp-sent'
            ? `We sent a code to ${email}`
            : 'Sync your kitchen across devices and unlock sharing.'}
        </Text>

        {mode === 'email' || mode === 'password' ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputRow}>
                <Mail size={20} stroke={KitchenDesign.colors.muted} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={KitchenDesign.colors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  style={styles.input}
                  accessibilityLabel="Email address"
                />
              </View>
            </View>

            {mode === 'password' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputRow}>
                  <Lock size={20} stroke={KitchenDesign.colors.muted} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Your password"
                    placeholderTextColor={KitchenDesign.colors.muted}
                    secureTextEntry
                    autoComplete="password"
                    style={styles.input}
                    accessibilityLabel="Password"
                  />
                </View>
              </View>
            ) : null}

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {mode === 'email' ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={handleSendOtp}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !isLoading ? styles.pressed : null,
                    isLoading ? styles.disabled : null,
                  ]}>
                  {isLoading ? (
                    <ActivityIndicator color={KitchenDesign.colors.cream} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send magic link</Text>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setMode('password')}
                  style={({ pressed }) => [styles.linkButton, pressed ? styles.pressed : null]}>
                  <Text style={styles.linkText}>Use password instead</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoading}
                  onPress={handlePasswordAuth}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !isLoading ? styles.pressed : null,
                    isLoading ? styles.disabled : null,
                  ]}>
                  {isLoading ? (
                    <ActivityIndicator color={KitchenDesign.colors.cream} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign in</Text>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setMode('email')}
                  style={({ pressed }) => [styles.linkButton, pressed ? styles.pressed : null]}>
                  <Text style={styles.linkText}>Use magic link instead</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        {mode === 'otp-sent' ? (
          <View style={styles.form}>
            {successMessage ? (
              <Text style={styles.successText}>{successMessage}</Text>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Verification code</Text>
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="123456"
                placeholderTextColor={KitchenDesign.colors.muted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                style={[styles.input, styles.otpInput]}
                accessibilityLabel="Verification code"
              />
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={handleVerifyOtp}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !isLoading ? styles.pressed : null,
                isLoading ? styles.disabled : null,
              ]}>
              {isLoading ? (
                <ActivityIndicator color={KitchenDesign.colors.cream} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify code</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMode('email');
                setOtpCode('');
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
              style={({ pressed }) => [styles.linkButton, pressed ? styles.pressed : null]}>
              <Text style={styles.linkText}>Try a different email</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.trustRow}>
          <Text style={styles.trustText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 12,
  },
  subtitle: {
    color: KitchenDesign.colors.muted,
    fontSize: 17,
    lineHeight: 24,
  },
  form: {
    gap: 18,
    marginTop: 8,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: KitchenDesign.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  inputRow: {
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    color: KitchenDesign.colors.ink,
    fontSize: 17,
    paddingVertical: 14,
  },
  otpInput: {
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    color: KitchenDesign.colors.ink,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  successText: {
    color: KitchenDesign.colors.sage,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 19,
    fontWeight: '800',
  },
  linkButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  linkText: {
    color: KitchenDesign.colors.orangePressed,
    fontSize: 16,
    fontWeight: '700',
  },
  trustRow: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  trustText: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.68,
  },
});
