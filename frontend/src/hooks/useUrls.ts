import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { urlApi } from "../api/endpoints";
import { CreateUrlRequest, Url } from "../types";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export const useUrls = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  // ✅ PAGINATION STATE
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Get all user URLs
  const {
    data: urls,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["urls", user?._id],
    queryFn: async () => {
      if (!isAuthenticated || !user) {
        return [];
      }
      const response = await urlApi.getUserUrls(page, limit);

      // ✅ UPDATE PAGINATION
      if (response.pagination) {
        setPagination(response.pagination);
      }

      return response.data?.urls || response.data || [];
    },
    enabled: !!isAuthenticated && !!user, // Sirf tabhi run karo jab user authenticated ho
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create short URL
  const createUrlMutation = useMutation({
    mutationFn: (data: CreateUrlRequest) => urlApi.shorten(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["urls", user?._id] });
      toast.success(data.message || "URL shortened successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to shorten URL");
    },
  });

  // Delete URL
  const deleteUrlMutation = useMutation({
    mutationFn: (shortCode: string) => urlApi.deleteUrl(shortCode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["urls"] });
      toast.success(data.message || "URL deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete URL");
    },
  });

  // Update URL
  const updateUrlMutation = useMutation({
    mutationFn: ({
      shortCode,
      longUrl,
    }: {
      shortCode: string;
      longUrl: string;
    }) => urlApi.updateUrl(shortCode, longUrl),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["urls"] });
      toast.success("URL updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update URL");
    },
  });

  // Check alias availability
  const checkAlias = useMutation({
    mutationFn: (alias: string) => urlApi.checkAlias(alias),
  });

  // ✅ PAGINATION FUNCTIONS
  const nextPage = () => {
    if (pagination.hasNext) {
      setPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (pagination.hasPrev) {
      setPage((prev) => prev - 1);
    }
  };

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= pagination.totalPages) {
      setPage(pageNum);
    }
  };

  return {
    urls: urls || [],
    isLoading,
    error,
    refetch,
    pagination,
    nextPage,
    prevPage,
    goToPage,
    currentPage: page,
    createUrl: createUrlMutation.mutateAsync,
    isCreating: createUrlMutation.isPending,
    deleteUrl: deleteUrlMutation.mutateAsync,
    isDeleting: deleteUrlMutation.isPending,
    updateUrl: updateUrlMutation.mutateAsync,
    isUpdating: updateUrlMutation.isPending,
    checkAlias: checkAlias.mutateAsync,
  };
};
