import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield, Lock, Eye, EyeOff, Mail, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Badge } from './Badge';

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempted with:', { email, password });
    // Navigate to dashboard after login
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#3B82F6] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#10B981] rounded-full opacity-10 blur-3xl"></div>
      </div>

      {/* Login Card */}
      <Card glass className="w-full max-w-md relative z-10 animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-[#3B82F6]/10 rounded-2xl">
              <Shield className="w-12 h-12 text-[#3B82F6]" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">CDSV</h1>
          <p className="text-[#9CA3AF] mb-4">Secure Cloud Data Platform</p>
          
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secure">
              <Lock className="w-3 h-3 mr-1" />
              Secure Login
            </Badge>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div className="relative">
            <Input
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-11"
            />
            <Mail className="absolute left-4 top-[42px] w-5 h-5 text-[#9CA3AF] pointer-events-none" />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-11 pr-11"
            />
            <Lock className="absolute left-4 top-[42px] w-5 h-5 text-[#9CA3AF] pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[42px] text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Forgot Password */}
          <div className="flex items-center justify-end">
            <a
              href="#"
              className="text-sm text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
            >
              Forgot password?
            </a>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full group"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#111827] text-[#9CA3AF]">or</span>
          </div>
        </div>

        {/* Create Account */}
        <div className="text-center">
          <p className="text-sm text-[#9CA3AF]">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-[#3B82F6] hover:text-[#60A5FA] font-medium transition-colors"
            >
              Create account
            </button>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
            <Shield className="w-4 h-4 text-[#10B981]" />
            <span>Protected by 256-bit SSL encryption</span>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-[#9CA3AF]">
          © 2026 CDSV. All rights reserved.
        </p>
      </div>
    </div>
  );
}