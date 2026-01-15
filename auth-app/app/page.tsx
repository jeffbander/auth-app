import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">Auth App</span>
          </div>
          <div className="flex items-center gap-4">
            {userId ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          HIPAA-Compliant Processing
        </div>
        <h1 className="text-5xl font-bold text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
          Echocardiogram Qualification
          <span className="text-blue-600"> Made Simple</span>
        </h1>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          Automatically analyze clinical notes to identify qualification criteria
          for insurance authorization. Save time and improve accuracy with
          intelligent NLP.
        </p>
        <div className="flex justify-center gap-4">
          {userId ? (
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-lg"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-lg"
              >
                Get Started
              </Link>
              <Link
                href="/sign-in"
                className="px-8 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-lg"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Powerful Features for Clinical Workflows
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                ),
                title: "Intelligent NLP Analysis",
                description:
                  "Automatically detect cardiac symptoms, history, and findings from clinical notes with advanced natural language processing.",
              },
              {
                icon: (
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                ),
                title: "Specialist Hierarchy",
                description:
                  "Prioritize findings based on specialist credibility. Cardiology notes take precedence over other specialties.",
              },
              {
                icon: (
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                ),
                title: "Export & Reports",
                description:
                  "Generate detailed CSV and Excel reports with clinical citations. Print authorization letters with one click.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
              >
                <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clinical Terms Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Comprehensive Clinical Detection
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Our system recognizes a wide range of cardiac symptoms, conditions,
            and diagnostic findings.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                title: "Cardiac Symptoms",
                items: ["Chest Pain", "Dyspnea", "Palpitations", "Syncope", "Edema"],
              },
              {
                title: "Cardiac History",
                items: ["MI", "Heart Failure", "AFib", "Valve Disease", "CAD"],
              },
              {
                title: "Cardiac Findings",
                items: [
                  "Abnormal EKG",
                  "Elevated Troponin",
                  "Cardiomegaly",
                  "JVD",
                  "Gallop",
                ],
              },
              {
                title: "Risk Factors",
                items: [
                  "Hypertension",
                  "Diabetes",
                  "Hyperlipidemia",
                  "Family Hx",
                  "Smoking",
                ],
              },
            ].map((category, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-xl p-6 border border-slate-200"
              >
                <h3 className="font-semibold text-slate-900 mb-3">
                  {category.title}
                </h3>
                <ul className="space-y-2">
                  {category.items.map((item, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-2 text-slate-600 text-sm"
                    >
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Streamline Your Workflow?
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Start analyzing clinical notes today. Our intelligent system helps
            you identify qualification criteria faster and more accurately.
          </p>
          {userId ? (
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
            >
              Get Started
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">Auth App</span>
            </div>
            <p className="text-slate-400 text-sm">
              HIPAA-compliant clinical note analysis for echocardiogram authorization
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
