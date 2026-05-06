import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import {
  apiClient,
  ApiError,
  type AuthResponse,
  type CurrentUser,
  unauthorizedEventName
} from '../lib/api';
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession
} from './auth-storage';

interface AuthContextValue {
  accessToken: string | null;
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (payload: {
    email: string;
    password: string;
  }) => Promise<AuthResponse>;
  register: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children
}: PropsWithChildren): JSX.Element {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return readStoredAuthSession()?.accessToken ?? null;
  });

  const currentUserQuery = useQuery({
    queryKey: ['auth', 'me', accessToken],
    queryFn: async () => {
      if (!accessToken) {
        return null;
      }

      return apiClient.me(accessToken);
    },
    enabled: Boolean(accessToken),
    retry: false
  });

  useEffect(() => {
    if (currentUserQuery.error instanceof ApiError) {
      if (currentUserQuery.error.status === 401) {
        clearStoredAuthSession();
        setAccessToken(null);
        void queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      }
    }
  }, [currentUserQuery.error, queryClient]);

  useEffect(() => {
    function handleUnauthorized(): void {
      clearStoredAuthSession();
      setAccessToken(null);
      void queryClient.removeQueries();
    }

    window.addEventListener(unauthorizedEventName, handleUnauthorized);
    return () => {
      window.removeEventListener(unauthorizedEventName, handleUnauthorized);
    };
  }, [queryClient]);

  const registerMutation = useMutation({
    mutationFn: apiClient.register,
    onSuccess: (response) => {
      writeStoredAuthSession({ accessToken: response.accessToken });
      setAccessToken(response.accessToken);
      queryClient.setQueryData(['auth', 'me', response.accessToken], response.user);
    }
  });

  const loginMutation = useMutation({
    mutationFn: apiClient.login,
    onSuccess: (response) => {
      writeStoredAuthSession({ accessToken: response.accessToken });
      setAccessToken(response.accessToken);
      queryClient.setQueryData(['auth', 'me', response.accessToken], response.user);
    }
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      currentUser: currentUserQuery.data ?? null,
      isAuthenticated: Boolean(accessToken),
      isInitializing: Boolean(accessToken) && currentUserQuery.isLoading,
      login: async (payload) => loginMutation.mutateAsync(payload),
      register: async (payload) => registerMutation.mutateAsync(payload),
      logout: () => {
        clearStoredAuthSession();
        setAccessToken(null);
        void queryClient.removeQueries({ queryKey: ['auth'] });
      }
    }),
    [
      accessToken,
      currentUserQuery.data,
      currentUserQuery.isLoading,
      loginMutation,
      queryClient,
      registerMutation
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
