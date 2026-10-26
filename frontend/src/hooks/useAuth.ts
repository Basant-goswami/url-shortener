import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export const useAuthMutations = () => {
  const { login: loginContext, register: registerContext, logout } = useAuth();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login({ email, password }),
    onSuccess: (data) => {
      loginContext(data.data.user.email, data.data.user.password);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Login failed");
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) =>
      authApi.register({ name, email, password, confirmPassword: password }),
    onSuccess: (data) => {
      registerContext(
        data.data.user.name,
        data.data.user.email,
        data.data.user.password,
      );
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Registration failed");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });

  return {
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
};
