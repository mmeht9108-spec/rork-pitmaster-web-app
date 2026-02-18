import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Order, CartItem } from '@/types/product';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

const ORDERS_KEY = 'app_orders';
const ORDERS_TABLE = 'orders';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string, email: string, createdAt: string) => {
    console.log('[Auth] Fetching profile for user:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId)
      .single();

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
  }, []);

  const setUserFromSession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const { id, email, created_at, user_metadata } = currentSession.user;

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
    setIsLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    console.log('[Auth] Initializing Supabase auth listener...');

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('[Auth] Initial session:', currentSession ? 'found' : 'none');
      setSession(currentSession);
      setUserFromSession(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('[Auth] Auth state changed:', _event);
        setSession(newSession);
        setUserFromSession(newSession);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUserFromSession]);

  const ordersQuery = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('[Orders] Fetching orders from Supabase for user:', user.id);
      const { data, error } = await supabase
        .from(ORDERS_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
    },
    enabled: !!user?.id,
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
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: data.email,
          options: {
            emailRedirectTo,
          },
        });
        if (resendError) {
          console.warn('[Auth] Resend confirmation email error:', resendError.message);
        } else {
          console.log('[Auth] Confirmation email resent');
        }
      }

      console.log('[Auth] Skipping profiles table insert to avoid RLS violations');

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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
      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('[Auth] Logging out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] Logout error:', error.message);
        throw new Error(error.message);
      }
      console.log('[Auth] Logged out successfully');
    },
    onSuccess: () => {
      setUser(null);
      setSession(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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
      const { error } = await supabase.from(ORDERS_TABLE).insert({
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
      });

      if (error) {
        console.warn('[Orders] Supabase insert error, saving to local cache:', error.message);
      }

      const stored = await AsyncStorage.getItem(ORDERS_KEY);
      const allOrders: Order[] = stored ? JSON.parse(stored) : [];
      allOrders.push(order);
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(allOrders));
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone?: string }) => {
      console.log('[Auth] Updating profile...');

      const { data: updatedData, error } = await supabase.auth.updateUser({
        data: {
          full_name: data.name,
          phone: data.phone ?? '',
        },
      });

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

  return {
    user,
    session,
    isLoggedIn,
    isLoading,
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
  };
});
