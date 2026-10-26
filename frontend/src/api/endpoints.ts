import { apiClient } from "./client";
import {
  CreateUrlRequest,
  CreateUrlResponse,
  Url,
  UrlStats,
  BulkCreateRequest,
  BulkCreateResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from "../types";

// ============ URL Endpoints ============

export const urlApi = {
  // Create short URL
  shorten: async (data: CreateUrlRequest): Promise<CreateUrlResponse> => {
    const response = await apiClient.post<CreateUrlResponse>(
      "/urls/shorten",
      data,
    );
    return response.data;
  },

  getUserUrls: async (page: number = 1, limit: number = 15) => {
    try {
      // console.log(`📡 Calling: /urls/my-urls?page=${page}&limit=${limit}`);
      const response = await apiClient.get(
        `/urls/my-urls?page=${page}&limit=${limit}`,
      );
      // console.log("✅ Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ Error:", error.response?.status, error.response?.data);
      throw error;
    }
  },

  // Get URL statistics
  getStats: async (
    shortCode: string,
  ): Promise<{ success: boolean; data: UrlStats }> => {
    const response = await apiClient.get(`/urls/stats/${shortCode}`);
    return response.data;
  },

  // Update URL
  updateUrl: async (
    shortCode: string,
    longUrl: string,
  ): Promise<{ success: boolean; data: Url }> => {
    const response = await apiClient.put(`/urls/${shortCode}`, { longUrl });
    return response.data;
  },

  // Delete URL
  deleteUrl: async (
    shortCode: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/urls/${shortCode}`);
    return response.data;
  },

  // Check alias availability
  checkAlias: async (
    alias: string,
  ): Promise<{
    success: boolean;
    data: { available: boolean; alias: string };
  }> => {
    const response = await apiClient.get(`/urls/check-alias/${alias}`);
    return response.data;
  },

  // Bulk shorten URLs
  bulkShorten: async (data: BulkCreateRequest): Promise<BulkCreateResponse> => {
    const response = await apiClient.post<BulkCreateResponse>(
      "/urls/bulk",
      data,
    );
    return response.data;
  },
};

// ============ Auth Endpoints ============

export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      "/users/register",
      data,
    );
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/users/login", data);
    return response.data;
  },

  getProfile: async (): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.get("/users/profile");
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};

// ============ Analytics Endpoints ============

export const analyticsApi = {
  getUrlAnalytics: async (shortCode: string, days?: number): Promise<any> => {
    const params = days ? `?days=${days}` : "";
    const response = await apiClient.get(`/analytics/${shortCode}${params}`);
    return response.data;
  },

  getOverallStats: async (): Promise<any> => {
    const response = await apiClient.get("/analytics/overall");
    return response.data;
  },

  // responseType: "blob" MOST IMPORTANT
  exportAnalytics: async (
    shortCode: string,
    format: string = "csv",
  ): Promise<Blob> => {
    const response = await apiClient.get(
      `/analytics/${shortCode}/export?format=${format}`,
      { responseType: "blob" },
    );
    return response.data;
  },
};
