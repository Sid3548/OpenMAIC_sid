'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-gray-700 hover:text-red-500 dark:hover:text-red-400 hover:shadow-sm transition-all"
      title="Sign out"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
