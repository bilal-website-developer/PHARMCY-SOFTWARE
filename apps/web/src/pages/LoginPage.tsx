import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole, ROLE_LABELS } from '@pharmacy/shared';
import { useAuthStore, DEMO_USERS } from '../stores/authStore';
import { Input } from '../components/ui/Input';
import { FormActionPair } from '../components/ui/FormActionPair';
import { Lock, User, Pill } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchDemoRole, isLoading, error, clearError } = useAuthStore();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [activeTab, setActiveTab] = useState<'form' | 'quick'>('quick');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login({ username, password });
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleQuickRoleSelect = (role: UserRole) => {
    switchDemoRole(role);
    if (role === UserRole.CASHIER) {
      navigate('/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-pharma-surface flex flex-col justify-center items-center p-4">
      {/* Pharma Care Header Brand */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pharma-primary text-pharma-white shadow-pharma-md mb-3 border border-pharma-primary">
          <Pill className="w-8 h-8 text-pharma-white" />
        </div>
        <h1 className="text-2xl font-black text-pharma-text tracking-tight">PharmaCare System</h1>
        <p className="text-xs text-pharma-muted mt-1">
          Pharmacy Management & POS System • Pakistan Edition (PKR Paisa / FEFO)
        </p>
      </div>

      {/* Login Card Panel */}
      <div className="w-full max-w-md bg-pharma-white rounded-pharma shadow-pharma-lg border border-pharma-muted/20 overflow-hidden">
        {/* Top green strip */}
        <div className="bg-pharma-primary text-pharma-white px-6 py-4 flex items-center justify-between border-b border-pharma-primary">
          <div>
            <h2 className="text-base font-bold text-pharma-white">System Authentication</h2>
            <p className="text-xs text-white/80 mt-0.5">Select a role or enter credentials</p>
          </div>
          <span className="text-xs font-mono bg-white/15 px-2 py-0.5 rounded text-pharma-white border border-white/20">
            Phase 0
          </span>
        </div>

        <div className="p-6">
          {/* Quick Demo Switcher Tabs */}
          <div className="flex border-b border-pharma-muted/20 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'quick'
                  ? 'border-pharma-primary text-pharma-primary'
                  : 'border-transparent text-pharma-muted hover:text-pharma-text'
              }`}
            >
              1-Click Demo Login
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'form'
                  ? 'border-pharma-primary text-pharma-primary'
                  : 'border-transparent text-pharma-muted hover:text-pharma-text'
              }`}
            >
              Manual Credentials
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-pharma bg-pharma-danger/10 border border-pharma-danger/30 text-pharma-danger text-xs font-medium flex items-start gap-2">
              <span className="shrink-0">•</span>
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'quick' ? (
            <div className="space-y-2.5">
              <p className="text-xs text-pharma-muted mb-2">
                Click any role to immediately test role-aware navigation and menu restrictions:
              </p>

              {(Object.keys(DEMO_USERS) as UserRole[]).map((r) => {
                const u = DEMO_USERS[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleQuickRoleSelect(r)}
                    className="w-full text-left p-3 rounded-pharma bg-pharma-surface border border-pharma-muted/25 hover:border-pharma-primary hover:shadow-pharma-sm transition-all group flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-pharma-primary group-hover:underline">
                          {ROLE_LABELS[r]}
                        </span>
                        <span className="text-[10px] text-pharma-muted font-mono bg-pharma-white px-1.5 py-0.5 rounded border border-pharma-muted/20">
                          {u.username}
                        </span>
                      </div>
                      <div className="text-[11px] text-pharma-muted mt-0.5">{u.fullName}</div>
                    </div>
                    <span className="text-xs text-pharma-primary font-semibold group-hover:translate-x-0.5 transition-transform">
                      Login →
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username / Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                prefixElement={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                prefixElement={<Lock className="w-4 h-4" />}
                required
              />

              <div className="pt-2">
                <FormActionPair
                  saveLabel="Sign In to System"
                  cancelLabel="Reset Form"
                  isSaving={isLoading}
                  saveType="submit"
                  onCancel={() => {
                    setUsername('');
                    setPassword('');
                    clearError();
                  }}
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-pharma-surface px-6 py-3 border-t border-pharma-muted/20 text-center">
          <p className="text-[11px] text-pharma-muted">
            Strict Multi-Role Security & Audit Trail Active
          </p>
        </div>
      </div>
    </div>
  );
};
