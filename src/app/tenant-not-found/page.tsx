export default function TenantNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 text-gray-400 mb-6">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0 9a9 9 0 01-9-9m9 9c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10 10 4.477 10 10z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Tenant Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            The workspace you're looking for doesn't exist or has been deactivated.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                What can you do?
              </h2>
              <div className="space-y-4 text-left">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">1</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">
                      <strong>Check the URL:</strong> Make sure you've entered the correct subdomain or domain name.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">2</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">
                      <strong>Contact the workspace owner:</strong> If you were invited to this workspace, contact the person who invited you.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">3</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">
                      <strong>Create a new workspace:</strong> Start your own workspace if you don't have one.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`${process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : 'http://localhost:3000'}`}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Main Site
                </a>
                <a
                  href={`${process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : 'http://localhost:3000'}/signup`}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Workspace
                </a>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Need help? Contact our support team for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}