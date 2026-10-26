import React from "react";
import { Link } from "react-router-dom";
import { Link2, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-gray-900 dark:text-white">
              ShortLink
            </span>
            <span className="text-gray-400 dark:text-gray-600">|</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              © 2026 All rights reserved
            </span>
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
            <Link
              to="/"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <a
              href="https://github.com/Basant-goswami"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              GitHub
            </a>
            <div className="flex items-center space-x-1">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500 fill-current animate-pulse" />
              <span>by Basant</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
