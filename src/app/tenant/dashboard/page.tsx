'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TenantInfo {
  tenant_id: string;
  domain_type: string;
  tenant_name?: string;
}

export default function TenantDashboard() {
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get tenant information from headers or API
    const fetchTenantInfo = async () => {
      try {
        // In a real implementation, you would extract the tenant identifier
        // from the domain and fetch tenant details from your API
        const response = await fetch('/api/tenant/current');
        if (response.ok) {
          const data = await response.json();
          setTenantInfo(data);
        } else {
          // Tenant not found or unauthorized
          router.push('/tenant-not-found');
        }
      } catch (error) {
        console.error('Failed to fetch tenant info:', error);
        router.push('/tenant-not-found');
      } finally {
        setLoading(false);
      }
    };

    fetchTenantInfo();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tenantInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Tenant Not Found
          </h1>
          <p className="text-gray-600">
            The requested tenant could not be found or is no longer active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                {tenantInfo.tenant_name || 'Tenant Dashboard'}
              </h1>
              <span className="ml-4 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {tenantInfo.domain_type === 'subdomain' ? 'Subdomain' : 'Custom Domain'}
              </span>
            </div>
            <nav className="flex space-x-8">
              <a href="/tenant/settings" className="text-gray-500 hover:text-gray-900">
                Settings
              </a>
              <a href="/tenant/domains" className="text-gray-500 hover:text-gray-900">
                Domains
              </a>
              <a href="/tenant/billing" className="text-gray-500 hover:text-gray-900">
                Billing
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Welcome Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">T</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Welcome to your workspace
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {tenantInfo.tenant_name || 'Your Tenant'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Domain Info Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">🌐</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Domain Type
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {tenantInfo.domain_type === 'subdomain' ? 'Subdomain' : 'Custom Domain'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <a
                    href="/tenant/domains"
                    className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Manage Domains
                  </a>
                  <a
                    href="/tenant/settings"
                    className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Tenant Settings
                  </a>
                  <a
                    href="/tenant/users"
                    className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    Manage Users
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Content Area */}
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Getting Started
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">
                      1. Set up your custom domain
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Add your own custom domain to provide a branded experience for your users.
                    </p>
                    <a
                      href="/tenant/domains"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Add Custom Domain
                    </a>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">
                      2. Customize your workspace
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Personalize your workspace with your branding, colors, and settings.
                    </p>
                    <a
                      href="/tenant/settings"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Customize Settings
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}