import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../api/endpoints";
import {
  BarChart3,
  Eye,
  Users,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ChevronLeft,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  TrendingUp,
  MapPin,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface AnalyticsData {
  basicInfo?: {
    shortCode: string;
    shortUrl: string;
    longUrl: string;
    totalClicks: number;
    createdAt: string;
    expiresAt: string | null;
    status: string;
    isCustomAlias: boolean;
  };
  summary?: {
    totalClicks: number;
    uniqueVisitors: number;
    last30Days: number;
    averagePerDay: number;
  };
  clicksByDay?: Array<{
    _id: { year: number; month: number; day: number };
    count: number;
  }>;
  deviceStats?: Array<{ _id: string; count: number }>;
  browserStats?: Array<{ _id: string; count: number }>;
  osStats?: Array<{ _id: string; count: number }>;
  countryStats?: Array<{ _id: string; count: number }>;
  referrerStats?: Array<{ _id: string; count: number }>;
  hourlyStats?: Array<{ _id: number; count: number }>;
  recentClicks?: Array<{
    clickedAt: string;
    ipAddress: string;
    device: string;
    browser: string;
    country: string;
  }>;
}

const DeviceIcon = ({ device }: { device: string }) => {
  const icons: Record<string, React.ReactNode> = {
    desktop: <Monitor className="h-5 w-5" />,
    mobile: <Smartphone className="h-5 w-5" />,
    tablet: <Tablet className="h-5 w-5" />,
    bot: <Users className="h-5 w-5" />,
  };
  return icons[device?.toLowerCase()] || <Globe className="h-5 w-5" />;
};

const getDeviceColor = (device: string) => {
  const colors: Record<string, string> = {
    desktop: "bg-blue-500",
    mobile: "bg-green-500",
    tablet: "bg-purple-500",
    bot: "bg-gray-500",
  };
  return colors[device?.toLowerCase()] || "bg-gray-400";
};

const getCountryFlag = (countryCode: string) => {
  const flags: Record<string, string> = {
    IN: "🇮🇳",
    US: "🇺🇸",
    GB: "🇬🇧",
    CA: "🇨🇦",
    AU: "🇦🇺",
    DE: "🇩🇪",
    FR: "🇫🇷",
    JP: "🇯🇵",
    CN: "🇨🇳",
    BR: "🇧🇷",
    RU: "🇷🇺",
    ZA: "🇿🇦",
    IT: "🇮🇹",
    ES: "🇪🇸",
    MX: "🇲🇽",
    KR: "🇰🇷",
  };
  return flags[countryCode?.toUpperCase()] || "🌍";
};

export const Analytics: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<
    "overview" | "devices" | "locations" | "recent"
  >("overview");

  const {
    data: rawData,
    isLoading,
    error,
    refetch,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["analytics", shortCode, days],
    queryFn: async () => {
      if (!shortCode) throw new Error("No short code provided");
      const response = await analyticsApi.getUrlAnalytics(shortCode, days);
      return response;
    },
    enabled: !!shortCode,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const data = rawData?.data || rawData || {};

  const basicInfo = data.basicInfo || {
    shortCode: shortCode || "",
    shortUrl: "",
    longUrl: "",
    totalClicks: 0,
    createdAt: "",
    expiresAt: null,
    status: "active",
    isCustomAlias: false,
  };

  const summary = data.summary || {
    totalClicks: 0,
    uniqueVisitors: 0,
    last30Days: 0,
    averagePerDay: 0,
  };

  const clicksByDay = data.clicksByDay || [];
  const deviceStats = data.deviceStats || [];
  const browserStats = data.browserStats || [];
  const osStats = data.osStats || [];
  const countryStats = data.countryStats || [];
  const referrerStats = data.referrerStats || [];
  const hourlyStats = data.hourlyStats || [];
  const recentClicks = data.recentClicks || [];

  const handleExport = async () => {
    try {
      toast.loading("Preparing export...", { id: "export-toast" });

      const blob = await analyticsApi.exportAnalytics(shortCode!);

      // Blob empty check
      if (!blob || blob.size === 0) {
        toast.error("No data available to export", { id: "export-toast" });
        return;
      }

      // Download trigger
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${shortCode}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Analytics exported successfully! 📥", {
        id: "export-toast",
      });
    } catch (error: any) {
      console.error("Export error:", error);

      let errorMsg = "Failed to export analytics";
      if (error.response?.status === 401) {
        errorMsg = "Please login again to export";
      } else if (error.response?.status === 404) {
        errorMsg = "No data found for this URL";
      } else if (error.response?.status === 403) {
        errorMsg = "You don't have permission to export this URL";
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(errorMsg, { id: "export-toast" });
    }
  };

  const maxClicks =
    clicksByDay.length > 0
      ? Math.max(...clicksByDay.map((d: any) => d.count || 0), 1)
      : 1;
  const maxHourly =
    hourlyStats.length > 0
      ? Math.max(...hourlyStats.map((h: any) => h.count || 0), 1)
      : 1;

  // ✅ 1. Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] transition-colors">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading analytics data...
          </p>
        </div>
      </div>
    );
  }

  // ✅ 2. No shortCode (SABSE PEHLE - ab yeh upar hai)
  if (!shortCode) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 transition-colors">
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-colors">
          <BarChart3 className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Select a URL to View Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Pick any shortened URL from your dashboard to see its analytics.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ✅ 3. Error State (NEECHE)
  if (isError || !rawData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 transition-colors">
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-colors">
          <BarChart3 className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Analytics Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This URL doesn't have any clicks yet. Share it to start tracking!
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-950 transition-colors min-h-[80vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <div className="flex items-center space-x-4 mt-2">
            <a
              href={basicInfo.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
            >
              <LinkIcon className="h-4 w-4 mr-1" />
              {basicInfo.shortUrl || `/${shortCode}`}
            </a>
            <span className="text-gray-400 dark:text-gray-600">|</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
              {basicInfo.longUrl || "Loading..."}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            onClick={handleExport}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
          >
            <Download className="h-4 w-4 mr-1" /> Export
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Clicks
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {summary.totalClicks || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Unique Visitors
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {summary.uniqueVisitors || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last {days} Days
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {summary.last30Days || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Avg. Per Day
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {summary.averagePerDay || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 transition-colors">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "devices", label: "Devices", icon: Monitor },
          { id: "locations", label: "Locations", icon: MapPin },
          { id: "recent", label: "Recent Clicks", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Clicks Over Time
              </h3>
              {clicksByDay && clicksByDay.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {clicksByDay.map((item: any, index: number) => {
                    const date = `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`;
                    const percentage = (item.count / maxClicks) * 100;
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-24 truncate">
                          {date}
                        </span>
                        <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No clicks recorded in this period
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Hourly Distribution
              </h3>
              {hourlyStats && hourlyStats.length > 0 ? (
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = hourlyStats.find((h: any) => h._id === i);
                    const count = hour?.count || 0;
                    const percentage = (count / maxHourly) * 100;
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-full flex justify-center">
                          <div
                            className="w-full max-w-[20px] bg-blue-500 rounded-t transition-all duration-500"
                            style={{
                              height: `${Math.max(percentage * 0.8, 4)}px`,
                              opacity: percentage > 0 ? 1 : 0.2,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          {String(i).padStart(2, "0")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No hourly data available
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Referrers
              </h3>
              {referrerStats && referrerStats.length > 0 ? (
                <div className="space-y-2">
                  {referrerStats.map((referrer: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-md">
                        {referrer._id || "Direct"}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {referrer.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No referrer data available
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "devices" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Devices
              </h3>
              {deviceStats && deviceStats.length > 0 ? (
                <div className="space-y-4">
                  {deviceStats.map((device: any, index: number) => {
                    const percentage =
                      summary.totalClicks > 0
                        ? (device.count / summary.totalClicks) * 100
                        : 0;
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                            <DeviceIcon device={device._id} />
                            <span className="capitalize">
                              {device._id || "Unknown"}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {device.count}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                          <div
                            className={`h-full ${getDeviceColor(device._id)} rounded transition-all duration-500`}
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No device data
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Browsers
              </h3>
              {browserStats && browserStats.length > 0 ? (
                <div className="space-y-2">
                  {browserStats.map((browser: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <span className="capitalize text-gray-900 dark:text-white">
                        {browser._id || "Unknown"}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {browser.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No browser data
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 md:col-span-2 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Operating Systems
              </h3>
              {osStats && osStats.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {osStats.map((os: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors"
                    >
                      <span className="capitalize text-gray-900 dark:text-white">
                        {os._id || "Unknown"}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {os.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No OS data</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "locations" && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Geographic Distribution
            </h3>
            {countryStats && countryStats.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {countryStats.map((country: any, index: number) => {
                  const percentage =
                    summary.totalClicks > 0
                      ? (country.count / summary.totalClicks) * 100
                      : 0;
                  return (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">
                            {getCountryFlag(country._id)}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {country._id || "Unknown"}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {country.count}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No location data available
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "recent" && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-800 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Clicks
            </h3>
            {recentClicks && recentClicks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Time
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        IP
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Device
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Browser
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Country
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentClicks.map((click: any, index: number) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-2 px-3 text-sm text-gray-900 dark:text-gray-300">
                          {click.clickedAt
                            ? new Date(click.clickedAt).toLocaleString()
                            : "N/A"}
                        </td>
                        <td className="py-2 px-3 text-sm font-mono text-gray-900 dark:text-gray-300">
                          {click.ipAddress || "Unknown"}
                        </td>
                        <td className="py-2 px-3 text-sm capitalize text-gray-900 dark:text-gray-300">
                          <div className="flex items-center space-x-1">
                            <DeviceIcon device={click.device} />
                            <span>{click.device || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-sm capitalize text-gray-900 dark:text-gray-300">
                          {click.browser || "Unknown"}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-900 dark:text-gray-300">
                          <div className="flex items-center space-x-1">
                            <span>{getCountryFlag(click.country)}</span>
                            <span>{click.country || "Unknown"}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No recent clicks recorded
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
