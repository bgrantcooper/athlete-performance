// app/components/auth/ViewLimitBanner.tsx
import { Link } from "react-router";

interface ViewLimitBannerProps {
  viewsRemaining: number;
  maxViews: number;
}

export function ViewLimitBanner({ viewsRemaining, maxViews }: ViewLimitBannerProps) {
  if (viewsRemaining <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Daily view limit reached
            </h3>
            <p className="text-sm text-red-600">
              You've viewed {maxViews} athlete profiles today. Upgrade for unlimited access.
            </p>
          </div>
          <Link
            to="/upgrade"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    );
  }

  if (viewsRemaining <= 3) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-amber-800">
              {viewsRemaining} views remaining today
            </h3>
            <p className="text-sm text-amber-600">
              Upgrade for unlimited athlete profile access.
            </p>
          </div>
          <Link
            to="/upgrade"
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Upgrade
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
