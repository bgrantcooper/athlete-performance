// app/components/auth/UserMenu.tsx
import { Form, Link } from "react-router";
import { useState } from "react";
import type { UserSession } from "~/lib/auth.server";

interface UserMenuProps {
  userSession: UserSession | null;
}

export function UserMenu({ userSession }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!userSession) {
    return (
      <div className="flex items-center space-x-4">
        <Link 
          to="/auth/login" 
          className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
        >
          Sign In
        </Link>
        <Link 
          to="/auth/register" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
      >
        <span className="text-sm font-medium">
          {userSession.firstName} {userSession.lastName}
        </span>
        <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
          {userSession.tier}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          <Link
            to="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>
          <Link
            to="/my-athletes"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            My Athletes
          </Link>
          {userSession.tier === 'free' && (
            <Link
              to="/upgrade"
              className="block px-4 py-2 text-sm text-amber-600 hover:bg-amber-50"
              onClick={() => setIsOpen(false)}
            >
              Upgrade
            </Link>
          )}
          <Form method="post" action="/auth/logout">
            <button
              type="submit"
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </Form>
        </div>
      )}
    </div>
  );
}