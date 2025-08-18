/ app/routes/upgrade.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getUserSession } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userSession = await getUserSession(request);
  return json({ userSession });
}

export default function Upgrade() {
  const { userSession } = useLoaderData<typeof loader>();

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: [
        "View up to 10 athlete profiles per day",
        "Basic race results",
        "Public athlete profiles only",
      ],
      limitations: [
        "No performance comparisons",
        "No virtual series creation",
        "Limited historical data",
      ],
      current: userSession?.tier === 'free',
      cta: "Current Plan",
    },
    {
      name: "Premium",
      price: "$9",
      period: "month",
      features: [
        "Unlimited athlete profile views",
        "Performance comparisons",
        "Create up to 5 virtual series",
        "Advanced analytics",
        "Export race data",
      ],
      popular: true,
      current: userSession?.tier === 'premium',
      cta: userSession?.tier === 'premium' ? "Current Plan" : "Upgrade to Premium",
    },
    {
      name: "Pro",
      price: "$29",
      period: "month",
      features: [
        "Everything in Premium",
        "Unlimited virtual series",
        "Coach dashboard",
        "Team management",
        "API access",
        "Priority support",
      ],
      current: userSession?.tier === 'pro',
      cta: userSession?.tier === 'pro' ? "Current Plan" : "Upgrade to Pro",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Unlock the full power of paddle sports performance tracking
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                plan.popular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.period !== 'forever' && (
                    <span className="text-gray-500">/{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
                {plan.limitations?.map((limitation, index) => (
                  <li key={`limit-${index}`} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-500">{limitation}</span>
                  </li>
                ))}
              </ul>

              <div className="text-center">
                {plan.current ? (
                  <button
                    disabled
                    className="w-full bg-gray-100 text-gray-500 py-3 px-6 rounded-lg font-medium cursor-not-allowed"
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors">
                    {plan.cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!userSession && (
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Don't have an account yet?
            </p>
            <Link
              to="/auth/register"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
            >
              Create Free Account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}