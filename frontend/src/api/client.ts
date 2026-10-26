import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

class ApiClient {
  private client: AxiosInstance;
  private static instance: ApiClient;

  private constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const errorMessage = this.getErrorMessage(error);

        // Don't show toast for 401 errors on login/register pages
        if (
          error.response?.status !== 401 ||
          !window.location.pathname.includes("/auth")
        ) {
          toast.error(errorMessage);
        }

        // Handle 401 Unauthorized - Redirect to login
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }

        return Promise.reject(error);
      },
    );
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private getErrorMessage(error: AxiosError): string {
    if (error.response?.data) {
      const data = error.response.data as any;
      if (data.message) return data.message;
      if (data.error) return data.error;
    }

    if (error.message === "Network Error") {
      return "Network error. Please check your internet connection.";
    }

    return error.message || "An unexpected error occurred.";
  }

  public getClient(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = ApiClient.getInstance().getClient();
