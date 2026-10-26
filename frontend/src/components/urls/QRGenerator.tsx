import React, { useState, useEffect, useMemo } from "react";
import { Download, X, Loader2 } from "lucide-react";
import { apiClient } from "../../api/client";
import toast from "react-hot-toast";

// ✅ Debounce utility
const debounce = (fn: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

interface QRGeneratorProps {
  shortCode: string;
  shortUrl: string;
  onClose: () => void;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  shortCode,
  onClose,
}) => {
  const [size, setSize] = useState(220);
  const [color, setColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Debounced fetch function
  const fetchQR = async (s: number, c: string, b: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        `/qr/${shortCode}?size=${s}&color=${encodeURIComponent(c)}&bgColor=${encodeURIComponent(b)}`,
      );
      setQrDataUrl(response.data.data.qrCode);
    } catch (error: any) {
      if (error.response?.status !== 429) {
        toast.error("Failed to load QR code");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedFetchQR = useMemo(() => debounce(fetchQR, 400), [shortCode]);

  useEffect(() => {
    debouncedFetchQR(size, color, bgColor);
  }, [size, color, bgColor]);

  const handleDownload = async (format: "png" | "svg") => {
    setIsDownloading(true);
    try {
      const response = await apiClient.get(
        `/qr/${shortCode}/download?size=${size}&color=${encodeURIComponent(color)}&bgColor=${encodeURIComponent(bgColor)}&format=${format}`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `qrcode-${shortCode}.${format === "svg" ? "svg" : "png"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`QR Code downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to download QR code");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 transition-colors">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <span className="mr-2">📱</span> QR Code
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="flex justify-center mb-6">
          {isLoading ? (
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="border border-gray-200 dark:border-gray-700 rounded-lg"
              style={{ width: size, height: size }}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Failed to generate QR
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Size Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Size: {size}px
            </label>
            <input
              type="range"
              min="100"
              max="500"
              step="10"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Color Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-700 bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Background
              </label>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-700 bg-transparent"
              />
            </div>
          </div>

          {/* Quick Colors */}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Quick Colors:
            </p>
            <div className="flex space-x-2">
              {[
                "#0ea5e9",
                "#8b5cf6",
                "#22c55e",
                "#ef4444",
                "#f59e0b",
                "#000000",
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c
                      ? "border-blue-500 scale-110"
                      : "border-transparent dark:border-gray-700"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Download Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDownload("png")}
              disabled={isDownloading}
              className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PNG
            </button>
            <button
              onClick={() => handleDownload("svg")}
              disabled={isDownloading}
              className="flex items-center justify-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              SVG
            </button>
          </div>
        </div>

        {/* Short URL Display */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Short URL:
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400 truncate">
            {`${import.meta.env.VITE_BASE_URL || "http://localhost:5000"}/${shortCode}`}
          </p>
        </div>
      </div>
    </div>
  );
};
