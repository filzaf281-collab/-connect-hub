"use client";

import "../../app/globals.css";
import { useState } from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border-t-4 border-green-500 text-center">
          <h2 className="text-2xl font-bold text-center mb-6">{children}</h2>
          <p className="text-gray-400 text-center mb-8">
            Welcome to ConnectHub
          </p>
          <div className="space-y-4">
            <button
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-md transition-colors"
            >
              Sign In
            </button>
            <button
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-md transition-colors"
            >
              Create Account
            </button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account? Sign in above
          </p>
        </div>
      </body>
    </html>
  );
}