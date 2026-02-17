import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Order, CartItem } from '@/types/product';
import { Session } from '@supabase/supabase-js';

const ORDERS_KEY = 'app_orders';

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
      if (!user) return [];
      const stored = await AsyncStorage.getItem(ORDERS_KEY);
      const allOrders: Order[] = stored ? JSON.parse(stored) : [];
      return allOrders
        .filter((o) => o.userPhone === user.phone || o.userName === user.name)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!user,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; full_name: string; phone: string }) => {
      console.log('[Auth] Registering user:', data.email);
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            phone: data.phone,
          },
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

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: data.full_name,
          phone: data.phone,
        });

      if (profileError) {
        console.warn('[Auth] Profile insert error:', profileError.message);
      } else {
        console.log('[Auth] Profile created successfully');
      }

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
      const order: Order = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        items: orderData.items,
        totalPrice: orderData.totalPrice,
        deliveryMethod: orderData.deliveryMethod,
        address: orderData.address,
        comment: orderData.comment,
        userName: orderData.userName,
        userPhone: orderData.userPhone,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

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
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            full_name: data.name,
            phone: data.phone ?? '',
          });

        if (profileUpdateError) {
          console.error('[Auth] Profile table update error:', profileUpdateError.message);
        }
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
