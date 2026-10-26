export interface User {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface Url {
  _id: string;
  shortCode: string;
  longUrl: string;
  shortUrl: string;
  clicks: number;
  isCustomAlias: boolean;
  status: "active" | "expired" | "disabled";
  userId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UrlStats extends Url {
  analytics: {
    clicksByDay: Array<{
      date: string;
      count: number;
    }>;
    devices: Array<{
      _id: string;
      count: number;
    }>;
    topReferrers: Array<{
      _id: string;
      count: number;
    }>;
    last30Days: number;
  };
}

export interface CreateUrlRequest {
  longUrl: string;
  customAlias?: string;
  method?: "sequential" | "random" | "hash";
  expiresIn?: number;
}

export interface CreateUrlResponse {
  success: boolean;
  data: {
    shortCode: string;
    shortUrl: string;
    longUrl: string;
    clicks: number;
    createdAt: string;
  };
  message: string;
  timestamp: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface BulkCreateRequest {
  urls: Array<{
    longUrl: string;
    customAlias?: string;
  }>;
}

export interface BulkCreateResponse {
  success: boolean;
  data: {
    successful: CreateUrlResponse["data"][];
    failed: Array<{
      url: string;
      error: string;
    }>;
    total: number;
    successCount: number;
    failureCount: number;
  };
}
