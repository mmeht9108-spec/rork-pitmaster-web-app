import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Order, CartItem } from '@/types/product';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { withTimeout } from '@/utils/timeout';

const ORDERS_KEY = 'app_orders';
const ORDERS_TABLE = 'orders';
const AUTH_INIT_TIMEOUT = 5000;

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string, email: string, createdAt: string) => {
    console.log('[Auth] Fetching profile for user:', userId);
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', userId)
          .single(),
        5000,
        'Profile fetch timed out'
      );

      if (error) {
        console.log('[Auth] Profile fetch error (may not exist yet):', error.message);
        return null;
      }

      return {
        id: userId,
        name: data.full_name ?? '',
        phone: data.phone ?? '',
        email,
        createdAt,
      } as User;
    } catch (err) {
      console.warn('[Auth] Profile fetch failed:', err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const setUserFromSession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const { id, email, created_at, user_metadata } = currentSession.user;

    try {
      const profile = await fetchProfile(id, email ?? '', created_at);
      if (profile) {
        setUser(profile);
      } else {
        setUser({
          id,
          name: user_metadata?.full_name ?? user_metadata?.name ?? '',
          phone: user_metadata?.phone ?? '',
          email: email ?? '',
          createdAt: created_at,
        });
      }
    } catch (err) {
      console.warn('[Auth] setUserFromSession error:', err instanceof Error ? err.message : String(err));
      setUser({
        id,
        name: user_metadata?.full_name ?? user_metadata?.name ?? '',
        phone: user_metadata?.phone ?? '',
        email: email ?? '',
        createdAt: created_at,
      });
    }
    setIsLoading(false);
  }, [fetchProfile]);

  const clearAuthStorage = useCallback(async () => {
    console.log('[Auth] Clearing auth storage...');
    try {
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(
        (key) => key.startsWith('sb-') || key.includes('supabase') || key.includes('refresh')
      );
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
        console.log('[Auth] Removed auth keys:', authKeys);
      }
    } catch (err) {
      console.warn('[Auth] Failed to clear auth storage:', err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleAuthError = useCallback(async (errorMessage: string) => {
    if (
      errorMessage.includes('Refresh Token') ||
      errorMessage.includes('refresh_token') ||
      errorMessage.includes('Invalid Refresh Token')
    ) {
      console.log('[Auth] Invalid refresh token detected, clearing storage and session...');
      await clearAuthStorage();
      try {
        await withTimeout(supabase.auth.signOut({ scope: 'local' }), 3000, 'signOut timed out');
      } catch {
        /* ignore */
      }
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return true;
    }
    return false;
  }, [clearAuthStorage]);

  useEffect(() => {
    console.log('[Auth] Initializing Supabase auth listener...');
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT,
          'getSession timed out - Supabase may be unreachable'
        );

        if (!isMounted) return;

        if (error) {
          console.warn('[Auth] getSession error:', error.message);
          const handled = await handleAuthError(error.message);
          if (handled) return;
          // Non-critical error: continue without session
          setIsSupabaseAvailable(false);
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        console.log('[Auth] Initial session:', currentSession ? 'found' : 'none');
        setSession(currentSession);
        void setUserFromSession(currentSession);
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[Auth] getSession failed:', msg);
        setIsSupabaseAvailable(false);
        setSession(null);
        setUser(null);
        setIsLoading(false);
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        console.log('[Auth] Auth state changed:', _event);
        if (_event === 'TOKEN_REFRESHED' && !newSession) {
          console.warn('[Auth] Token refresh failed, clearing session...');
          await clearAuthStorage();
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
        if (_event === 'SIGNED_OUT') {
          await clearAuthStorage();
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }
        setSession(newSession);
        void setUserFromSession(newSession);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setUserFromSession, handleAuthError, clearAuthStorage]);

  const ordersQuery = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('[Orders] Fetching orders from Supabase for user:', user.id);
      try {
        const { data, error } = await withTimeout(
          supabase
            .from(ORDERS_TABLE)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          6000,
          'Orders fetch timed out'
        );

        if (error) {
          console.warn('[Orders] Supabase fetch error, falling back to local cache:', error.message);
          const stored = await AsyncStorage.getItem(ORDERS_KEY);
          const allOrders: Order[] = stored ? JSON.parse(stored) : [];
          return allOrders
            .filter((o) => o.userId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        const orders: Order[] = (data ?? []).map((row) => ({
          id: String(row.id ?? ''),
          userId: String(row.user_id ?? ''),
          items: (row.items ?? []) as CartItem[],
          totalPrice: Number(row.total_price ?? 0),
          deliveryMethod: (row.delivery_method ?? 'pickup') as 'pickup' | 'delivery',
          address: row.address ?? undefined,
          comment: row.comment ?? undefined,
          userName: String(row.user_name ?? ''),
          userPhone: String(row.user_phone ?? ''),
          status: (row.status ?? 'pending') as Order['status'],
          createdAt: String(row.created_at ?? new Date().toISOString()),
        }));

        return orders;
      } catch (err) {
        console.warn('[Orders] Fetch failed:', err instanceof Error ? err.message : String(err));
        const stored = await AsyncStorage.getItem(ORDERS_KEY);
        const allOrders: Order[] = stored ? JSON.parse(stored) : [];
        return allOrders
          .filter((o) => o.userId === user.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },
    enabled: !!user?.id && isSupabaseAvailable,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; full_name: string; phone: string }) => {
      console.log('[Auth] Registering user:', data.email);
      const emailRedirectTo = Linking.createURL('/login');
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            phone: data.phone,
          },
          emailRedirectTo,
        },
      });

      if (error) {
        console.error('[Auth] Register error:', error.message);
        throw new Error(error.message);
      }

      if (!authData.user) {
        throw new Error('Не удалось создать пользователя');
      }

      console.log('[Auth] User registered successfully:', authData.user.id);

      if (!authData.session) {
        console.warn('[Auth] No session after signUp. Attempting to resend confirmation email...');
        try {
          const { error: resendError } = await withTimeout(
            supabase.auth.resend({
              type: 'signup',
              email: data.email,
              options: { emailRedirectTo },
            }),
            5000,
            'Resend timed out'
          );
          if (resendError) {
            console.warn('[Auth] Resend confirmation email error:', resendError.message);
          } else {
            console.log('[Auth] Confirmation email resent');
          }
        } catch (err) {
          console.warn('[Auth] Resend failed:', err instanceof Error ? err.message : String(err));
        }
      }

      console.log('[Auth] Skipping profiles table insert to avoid RLS violations');

      return authData;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      console.log('[Auth] Logging in user:', data.email);
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.error('[Auth] Login error:', error.message);
        throw new Error(error.message);
      }

      console.log('[Auth] User logged in successfully:', authData.user.id);
      setIsSupabaseAvailable(true);
      return authData;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('[Auth] Logging out...');
      const { error } = await withTimeout(
        supabase.auth.signOut(),
        5000,
        'Logout timed out'
      );
      if (error) {
        console.error('[Auth] Logout error:', error.message);
        throw new Error(error.message);
      }
      console.log('[Auth] Logged out successfully');
    },
    onError: (error) => {
      console.warn('[Auth] Logout error, forcing local cleanup:', error.message);
      setUser(null);
      setSession(null);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onSuccess: () => {
      setUser(null);
      setSession(null);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const addOrderMutation = useMutation({
    mutationFn: async (orderData: {
      items: CartItem[];
      totalPrice: number;
      deliveryMethod: 'pickup' | 'delivery';
      address?: string;
      comment?: string;
      userName: string;
      userPhone: string;
    }) => {
      if (!user?.id) {
        throw new Error('Пользователь не авторизован');
      }

      const orderId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const createdAt = new Date().toISOString();

      const order: Order = {
        id: orderId,
        userId: user.id,
        items: orderData.items,
        totalPrice: orderData.totalPrice,
        deliveryMethod: orderData.deliveryMethod,
        address: orderData.address,
        comment: orderData.comment,
        userName: orderData.userName,
        userPhone: orderData.userPhone,
        status: 'pending',
        createdAt,
      };

      console.log('[Orders] Saving order to Supabase:', orderId);
      try {
        const { error } = await withTimeout(
          supabase.from(ORDERS_TABLE).insert({
            id: orderId,
            user_id: user.id,
            items: order.items,
            total_price: order.totalPrice,
            delivery_method: order.deliveryMethod,
            address: order.address ?? null,
            comment: order.comment ?? null,
            user_name: order.userName,
            user_phone: order.userPhone,
            status: order.status,
            created_at: createdAt,
          }),
          6000,
          'Order insert timed out'
        );

        if (error) {
          console.warn('[Orders] Supabase insert error, saving to local cache:', error.message);
        }
      } catch (err) {
        console.warn('[Orders] Supabase insert failed:', err instanceof Error ? err.message : String(err));
      }

      const stored = await AsyncStorage.getItem(ORDERS_KEY);
      const allOrders: Order[] = stored ? JSON.parse(stored) : [];
      allOrders.push(order);
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(allOrders));
      return order;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone?: string }) => {
      console.log('[Auth] Updating profile...');

      const { data: updatedData, error } = await withTimeout(
        supabase.auth.updateUser({
          data: {
            full_name: data.name,
            phone: data.phone ?? '',
          },
        }),
        5000,
        'Update profile timed out'
      );

      if (error) {
        console.error('[Auth] Update user metadata error:', error.message);
        throw new Error(error.message);
      }

      if (session?.user?.id) {
        console.log('[Auth] Skipping profiles table update to avoid RLS violations');
      }

      const updatedUser: User = {
        id: updatedData.user.id,
        name: data.name,
        phone: data.phone ?? '',
        email: updatedData.user.email ?? '',
        createdAt: updatedData.user.created_at,
      };

      console.log('[Auth] Profile updated successfully');
      return updatedUser;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
  });

  const isLoggedIn = !!session && !!user;
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  return useMemo(() => ({
    user,
    session,
    isLoggedIn,
    isLoading,
    isSupabaseAvailable,
    orders,
    ordersLoading: ordersQuery.isLoading,
    register: registerMutation.mutateAsync,
    registerPending: registerMutation.isPending,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    logout: logoutMutation.mutate,
    addOrder: addOrderMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    updateProfilePending: updateProfileMutation.isPending,
  }), [
    user,
    session,
    isLoggedIn,
    isLoading,
    isSupabaseAvailable,
    orders,
    ordersQuery.isLoading,
    registerMutation.mutateAsync,
    registerMutation.isPending,
    loginMutation.mutateAsync,
    loginMutation.isPending,
    logoutMutation.mutate,
    addOrderMutation.mutateAsync,
    updateProfileMutation.mutateAsync,
    updateProfileMutation.isPending,
  ]);
});
