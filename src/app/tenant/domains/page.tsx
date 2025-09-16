'use client';

import { useEffect, useState } from 'react';
import { Domain, DomainVerification } from '@/lib/database/types';

interface DomainWithVerification extends Domain {
  verification_records?: DomainVerification[];
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<DomainWithVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [domainType, setDomainType] = useState<'subdomain' | 'custom'>('custom');
  const [tenantId, setTenantId] = useState<string>('');

  useEffect(() => {
    fetchCurrentTenant();
  }, []);

  const fetchCurrentTenant = async () => {
    try {
      const response = await fetch('/api/tenant/current');
      if (response.ok) {
        const data = await response.json();
        setTenantId(data.tenant_id);
        setDomains(data.domains || []);
      }
    } catch (error) {
      console.error('Failed to fetch tenant info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim() || !tenantId) return;

    try {
      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          domain: newDomain.trim(),
          type: domainType,
          verification_method: 'dns'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDomains(prev => [...prev, {
          ...result.data,
          verification_records: result.verification_records
        }]);
        setNewDomain('');
        setShowAddModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add domain');
      }
    } catch (error) {
      console.error('Failed to add domain:', error);
      alert('Failed to add domain');
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const response = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain_id: domainId }),
      });

      if (response.ok) {
        const result = await response.json();
        setDomains(prev => prev.map(domain =>
          domain.id === domainId
            ? { ...domain, status: result.data.status, ssl_status: result.data.ssl_status }
            : domain
        ));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to verify domain');
      }
    } catch (error) {
      console.error('Failed to verify domain:', error);
      alert('Failed to verify domain');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <a href="/tenant/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">
                ← Back to Dashboard
              </a>
              <h1 className="text-3xl font-bold text-gray-900">Domain Management</h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Domain
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Domains List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {domains.length === 0 ? (
                <li className="px-6 py-8 text-center">
                  <p className="text-gray-500">No domains configured yet.</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Add your first domain
                  </button>
                </li>
              ) : (
                domains.map((domain) => (
                  <li key={domain.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 text-sm">
                              {domain.type === 'subdomain' ? '🏠' : '🌐'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-lg font-medium text-gray-900">
                              {domain.domain}
                            </p>
                            <span className="ml-2 text-xs text-gray-500">
                              ({domain.type})
                            </span>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(domain.status)}`}>
                              {domain.status}
                            </span>
                            {domain.ssl_enabled && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                SSL
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Added {new Date(domain.created_at).toLocaleDateString()}
                            {domain.verified_at && ` • Verified ${new Date(domain.verified_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {domain.status === 'pending' && (
                          <button
                            onClick={() => handleVerifyDomain(domain.id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Verify
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-600">
                          <span className="sr-only">Options</span>
                          ⋮
                        </button>
                      </div>
                    </div>

                    {/* Verification Instructions */}
                    {domain.status === 'pending' && domain.verification_records && (
                      <div className="mt-4 p-4 bg-yellow-50 rounded-md">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">
                          DNS Configuration Required
                        </h4>
                        <p className="text-sm text-yellow-700 mb-3">
                          Add these DNS records to your domain to verify ownership:
                        </p>
                        <div className="space-y-2">
                          {domain.verification_records.map((record, index) => (
                            <div key={index} className="bg-white p-3 rounded border">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="font-medium">Type:</span> {record.type}
                                </div>
                                <div className="break-all">
                                  <span className="font-medium">Name:</span> {record.name}
                                </div>
                                <div className="break-all">
                                  <span className="font-medium">Value:</span> {record.value}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>

        </div>
      </main>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Domain</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Type
                </label>
                <select
                  value={domainType}
                  onChange={(e) => setDomainType(e.target.value as 'subdomain' | 'custom')}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="custom">Custom Domain</option>
                  <option value="subdomain">Subdomain</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {domainType === 'custom' ? 'Domain Name' : 'Subdomain'}
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder={domainType === 'custom' ? 'example.com' : 'mycompany'}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {domainType === 'subdomain' && (
                  <p className="mt-1 text-sm text-gray-500">
                    Will create: {newDomain}.yourdomain.com
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDomain}
                  disabled={!newDomain.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Domain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}