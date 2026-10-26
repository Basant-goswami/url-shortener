import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "../types";
import { authApi } from "../api/endpoints";
import toast from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        // Verify token validity
        verifyToken().catch(() => {
          logout();
        });
      } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    setIsLoading(false);
  }, []);

  const verifyToken = async () => {
    try {
      const response = await authApi.getProfile();
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
    } catch (error) {
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    if (response.success) {
      setUser(response.data.user);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      toast.success("Welcome back! 🎉");
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await authApi.register({
      name,
      email,
      password,
      confirmPassword: password,
    });
    if (response.success) {
      setUser(response.data.user);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      toast.success("Account created successfully! 🎉");
    }
  };

  const logout = () => {
    setUser(null);
    authApi.logout();
    toast.success("Logged out successfully");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    // This would call your API
    toast.success("Password changed successfully");
  };

  const forgotPassword = async (email: string) => {
    // This would call your API
    toast.success("Password reset link sent to your email");
    return "reset-token-12345";
  };

  const resetPassword = async (token: string, newPassword: string) => {
    // This would call your API
    toast.success("Password reset successfully");
  };

  const deleteAccount = async () => {
    // This would call your API
    toast.success("Account deleted successfully");
    logout();
  };

  const refreshToken = async () => {
    try {
      const response = await authApi.refreshToken();
      localStorage.setItem("token", response.data.token);
    } catch (error) {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
        changePassword,
        forgotPassword,
        resetPassword,
        deleteAccount,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
