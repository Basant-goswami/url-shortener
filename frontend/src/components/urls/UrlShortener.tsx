import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUrls } from "../../hooks/useUrls";
import { useAuth } from "../../context/AuthContext";
import {
  Link2,
  Copy,
  Check,
  Loader2,
  Sparkles,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

const urlSchema = z.object({
  longUrl: z
    .string()
    .min(1, "URL is required")
    .url("Please enter a valid URL")
    .transform((val) => {
      if (!val.startsWith("http://") && !val.startsWith("https://")) {
        return `http://${val}`;
      }
      return val;
    }),
  customAlias: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[a-zA-Z0-9-]+$/.test(val),
      "Only letters, numbers, and hyphens allowed",
    )
    .refine(
      (val) => !val || (val.length >= 4 && val.length <= 30),
      "Alias must be 4-30 characters",
    ),
  method: z.enum(["random", "sequential", "hash"]).default("random"),
  expiresIn: z.number().min(1).max(365).optional(),
});

type UrlFormData = z.infer<typeof urlSchema>;

export const UrlShortener: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { createUrl, isCreating, checkAlias } = useUrls();
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [aliasAvailable, setAliasAvailable] = useState<boolean | null>(null);
  const [isCheckingAlias, setIsCheckingAlias] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<UrlFormData>({
    resolver: zodResolver(urlSchema),
    defaultValues: { method: "random" },
  });

  const customAlias = watch("customAlias");

  useEffect(() => {
    const checkAliasAvailability = async () => {
      if (!customAlias || customAlias.length < 4) {
        setAliasAvailable(null);
        return;
      }
      setIsCheckingAlias(true);
      try {
        const result = await checkAlias(customAlias);
        setAliasAvailable(result.data.available);
      } catch (error) {
        setAliasAvailable(false);
      } finally {
        setIsCheckingAlias(false);
      }
    };
    const debounceTimer = setTimeout(checkAliasAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [customAlias, checkAlias]);

  const onSubmit = async (data: UrlFormData) => {
    try {
      const result = await createUrl({
        longUrl: data.longUrl,
        customAlias: data.customAlias || undefined,
        method: data.method,
        expiresIn: data.expiresIn,
      });
      setShortenedUrl(result.data.shortUrl);
      setShortCode(result.data.shortCode);
      toast.success("URL shortened successfully! 🎉");
      setTimeout(() => {
        reset();
        setShortenedUrl(null);
        setShortCode(null);
        setAliasAvailable(null);
      }, 5000);
    } catch (error) {
      console.error("Shortening failed:", error);
    }
  };

  const handleCopy = async () => {
    if (shortenedUrl) {
      try {
        await navigator.clipboard.writeText(shortenedUrl);
        setIsCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        toast.error("Failed to copy");
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Long URL <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Link2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="url"
              {...register("longUrl")}
              placeholder="https://example.com/very/long/url"
              className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.longUrl
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            />
          </div>
          {errors.longUrl && (
            <p className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.longUrl.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom Alias (Optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              {...register("customAlias")}
              placeholder="my-custom-link"
              className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.customAlias
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            />
            {isCheckingAlias && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              </div>
            )}
          </div>
          {errors.customAlias && (
            <p className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.customAlias.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Method
            </label>
            <select
              {...register("method")}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="random">🎲 Random</option>
              <option value="sequential">📊 Sequential</option>
              <option value="hash">🔐 Hash-based</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expires In (Days)
            </label>
            <select
              {...register("expiresIn", { valueAsNumber: true })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Never expires</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating || aliasAvailable === false}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 ${
            isCreating || aliasAvailable === false
              ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
          }`}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Shortening...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>Shorten URL</span>
            </>
          )}
        </button>

        {shortenedUrl && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Your shortened URL:
                </p>
                <div className="flex items-center space-x-2">
                  <Link2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <a
                    href={shortenedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium truncate"
                  >
                    {shortenedUrl}
                  </a>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="ml-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all flex items-center space-x-1 text-gray-600 dark:text-gray-300"
              >
                {isCopied ? (
                  <>
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-500">
                      Copied
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span className="text-sm font-medium">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {isAuthenticated && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
            <Clock className="h-4 w-4" />
            <span>
              💡 Pro tip: Sign in to manage all your shortened URLs and view
              analytics!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
