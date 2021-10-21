import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import * as AuthSession from 'expo-auth-session';
import { api } from '../services/api';

const CLIENT_ID = 'baf6a10ad7ce8ef77246';
const SCOPE = 'read:user';
const USER_STORAGE = '@heatmboile:user';
const TOKEN_STORAGE = '@heatmboile:token';

type User = {
  id: string;
  avatar_utl: string;
  name: string;
  login: string;
}

type AuthContextData = {
  user: User |  null;
  isSigning: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

type AuthProviderProps = {
  children: React.ReactNode;
}

type AuthResponse = {
  token: string;
  user: User;
}

type AuthorizationResponse = {
  params: {
    code?: string;
    error?: string;
  },
  type?: string;
}

export const AuthContext = createContext({} as AuthContextData);

function AuthProvider({ children } : AuthProviderProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  async function signIn() {
    try {
      setIsSigning(true);
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPE}`;
      const authSessionResponse = await AuthSession.startAsync({ authUrl }) as AuthorizationResponse;
  
      if(authSessionResponse.type === 'success' && authSessionResponse.params.error !== 'access_denied'){
        const authResponse = await api.post('authenticate', { code: authSessionResponse.params.code });
        const { user, token } = authResponse.data as AuthResponse;
  
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await AsyncStorage.setItem(USER_STORAGE, JSON.stringify(user));
        await AsyncStorage.setItem(USER_STORAGE, token);
  
        setUser(user);
      }
    }catch(err){
      console.log(err);
    } finally {
      setIsSigning(false);
    }


    setIsSigning(false);
  }

  async function signOut() {
    setUser(null);
    await AsyncStorage.removeItem(USER_STORAGE);
    await AsyncStorage.removeItem(TOKEN_STORAGE);
  }

  useEffect(() => {
    async function loadUserStorageData() {
      const userStorage = await AsyncStorage.getItem(USER_STORAGE);
      const tokenStorage = await AsyncStorage.getItem(TOKEN_STORAGE);

      if(userStorage && tokenStorage) {
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenStorage}`;
        setUser(JSON.parse(userStorage));
      }

      setIsSigning(false);
    }
    loadUserStorageData();
  },[]);

  return (
    <AuthContext.Provider value={{
      signIn,
      signOut,
      user,
      isSigning
    }} >
      {children}
    </AuthContext.Provider>
  )
}

function useAuth() {
  const context = useContext(AuthContext);

  return context;
}

export { AuthProvider, useAuth }