import React, { useState, useEffect } from "react";
import { useUrls } from "../hooks/useUrls";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  Link2,
  Eye,
  Trash2,
  Copy,
  Check,
  BarChart3,
  Plus,
  Loader2,
  Search,
  Power,
  PowerOff,
  AlertTriangle,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { Url } from "../types";
import toast from "react-hot-toast";
import { UrlShortener } from "../components/urls/UrlShortener";
import { apiClient } from "../api/client";
import { QRGenerator } from "../components/urls/QRGenerator";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { urls, isLoading, error, refetch } = useUrls();
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{
    shortCode: string;
  } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch URLs when component mounts or user changes
  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user, refetch]);

  // Copy to clipboard
  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  // Toggle status (Enable/Disable)
  const handleToggleStatus = async (
    shortCode: string,
    currentStatus: string,
  ) => {
    setTogglingId(shortCode);
    try {
      const response = await apiClient.patch(`/urls/${shortCode}/status`);
      const newStatus = response.data.data.status;
      toast.success(
        `URL ${newStatus === "active" ? "enabled" : "disabled"} successfully`,
      );
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (shortCode: string) => {
    try {
      await apiClient.delete(`/urls/${shortCode}/permanent`);
      toast.success("URL permanently deleted");
      refetch();
      setShowDeleteModal(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  // Filter URLs based on search
  const filteredUrls = urls?.filter(
    (url: Url) =>
      url.longUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      url.shortCode.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Get status color
  const getStatusColor = (status: string) => {
    const colors = {
      active:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      disabled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading your URLs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 dark:bg-gray-950 transition-colors min-h-[80vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track all your shortened URLs
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(!showCreateModal)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          New URL
        </button>
      </div>

      {/* Create URL Modal */}
      {showCreateModal && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Shorten New URL
            </h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>
          <UrlShortener />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Link2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total URLs
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {urls?.length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Clicks
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {urls?.reduce((sum: number, url: Url) => sum + url.clicks, 0) ||
                  0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Avg. Clicks/URL
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {urls?.length
                  ? Math.round(
                      (urls.reduce(
                        (sum: number, url: Url) => sum + url.clicks,
                        0,
                      ) /
                        urls.length) *
                        10,
                    ) / 10
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search URLs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:placeholder:text-gray-500 dark:text-white transition-all"
          />
        </div>
      </div>

      {/* URL List */}
      {filteredUrls && filteredUrls.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Short URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Original URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUrls.map((url: Url) => (
                  <tr
                    key={url._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <a
                          href={url.shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                        >
                          /{url.shortCode}
                        </a>
                        <button
                          onClick={() => handleCopy(url.shortUrl, url._id)}
                          className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {copiedId === url._id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-gray-600 dark:text-gray-400">
                        {url.longUrl}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-gray-900 dark:text-white">
                        <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">{url.clicks}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(url.status)}`}
                      >
                        {url.status === "active" ? "🟢 Active" : "⚪ Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(url.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* QR Code Button */}
                        <button
                          onClick={() => setShowQR(url.shortCode)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                          title="Generate QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>

                        {/* Analytics Button */}
                        <Link
                          to={`/stats/${url.shortCode}`}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="View Analytics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Link>

                        {/* Open Link Button */}
                        <a
                          href={url.shortUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                          title="Open URL"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>

                        {/* Toggle Status Button (Enable/Disable) */}
                        <button
                          onClick={() =>
                            handleToggleStatus(url.shortCode, url.status)
                          }
                          disabled={togglingId === url.shortCode}
                          className={`p-1.5 rounded transition-colors ${
                            url.status === "active"
                              ? "text-green-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                              : "text-gray-400 dark:text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"
                          } ${togglingId === url.shortCode ? "opacity-50 cursor-not-allowed" : ""}`}
                          title={url.status === "active" ? "Disable" : "Enable"}
                        >
                          {togglingId === url.shortCode ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : url.status === "active" ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>

                        {/* Permanent Delete Button */}
                        <button
                          onClick={() =>
                            setShowDeleteModal({ shortCode: url.shortCode })
                          }
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Permanently Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-colors">
          <Link2 className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No URLs found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm
              ? "Try adjusting your search"
              : "Start by shortening your first URL!"}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Shorten a URL
            </button>
          )}
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <QRGenerator
          shortCode={showQR}
          shortUrl={`${import.meta.env.VITE_BASE_URL || "http://localhost:5000"}/${showQR}`}
          onClose={() => setShowQR(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-gray-200 dark:border-gray-800">
            <div className="flex items-start space-x-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Permanent Delete?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                  This action <strong>cannot be undone</strong>. All analytics
                  data for this URL will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-700 dark:text-red-400">
                Are you sure you want to permanently delete this URL?
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(showDeleteModal.shortCode)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Yes, Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
