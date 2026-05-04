import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Shield, Lock, Eye, EyeOff, Mail, User, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Badge } from './Badge';
import { cn } from '../shadcn/utils';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  variant: 'danger' | 'warning' | 'secure';
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  
  if (score <= 2) {
    return { score, label: 'Weak', color: '#EF4444', variant: 'danger' };
  } else if (score <= 3) {
    return { score, label: 'Medium', color: '#F59E0B', variant: 'warning' };
  } else {
    return { score, label: 'Strong', color: '#10B981', variant: 'secure' };
  }
}

export function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'Weak',
    color: '#EF4444',
    variant: 'danger',
  });

  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    }
  }, [formData.password]);

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleBlur = (field: keyof typeof touched) => () => {
    setTouched({ ...touched, [field]: true });
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const errors = {
    name: touched.name && formData.name.length < 2 ? 'Name must be at least 2 characters' : '',
    email: touched.email && !validateEmail(formData.email) ? 'Please enter a valid email' : '',
    password: touched.password && formData.password.length < 8 ? 'Password must be at least 8 characters' : '',
    confirmPassword: touched.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : '',
  };

  const isValid = {
    name: formData.name.length >= 2,
    email: validateEmail(formData.email),
    password: formData.password.length >= 8,
    confirmPassword: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    // Check if form is valid
    if (Object.values(isValid).every(Boolean)) {
      console.log('Registration submitted:', formData);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#3B82F6] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#10B981] rounded-full opacity-10 blur-3xl"></div>
      </div>

      {/* Registration Card */}
      <Card glass className="w-full max-w-md relative z-10 animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-[#3B82F6]/10 rounded-2xl">
              <Shield className="w-12 h-12 text-[#3B82F6]" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">Create Account</h1>
          <p className="text-[#9CA3AF] mb-4">Join the Secure Cloud Data Platform</p>
          
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secure">
              <Lock className="w-3 h-3 mr-1" />
              Encrypted Registration
            </Badge>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Input */}
          <div className="relative">
            <Input
              type="text"
              label="Full Name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange('name')}
              onBlur={handleBlur('name')}
              error={!!errors.name}
              helperText={errors.name}
              className="pl-11 pr-11"
            />
            <User className="absolute left-4 top-[42px] w-5 h-5 text-[#9CA3AF] pointer-events-none" />
            {isValid.name && touched.name && (
              <div className="absolute right-4 top-[42px] text-[#10B981]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Email Input */}
          <div className="relative">
            <Input
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              error={!!errors.email}
              helperText={errors.email}
              className="pl-11 pr-11"
            />
            <Mail className="absolute left-4 top-[42px] w-5 h-5 text-[#9CA3AF] pointer-events-none" />
            {isValid.email && touched.email && (
              <div className="absolute right-4 top-[42px] text-[#10B981]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Password Input */}
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              error={!!errors.password}
              helperText={errors.password}
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

          {/* Password Strength Meter */}
          {formData.password && (
            <div className="space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9CA3AF]">Password Strength</span>
                <Badge variant={passwordStrength.variant}>{passwordStrength.label}</Badge>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-all duration-300',
                      level <= passwordStrength.score
                        ? 'opacity-100'
                        : 'opacity-20'
                    )}
                    style={{
                      backgroundColor: level <= passwordStrength.score ? passwordStrength.color : '#374151',
                    }}
                  />
                ))}
              </div>
              <div className="space-y-1">
                <PasswordRequirement 
                  met={formData.password.length >= 8} 
                  text="At least 8 characters" 
                />
                <PasswordRequirement 
                  met={/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password)} 
                  text="Upper & lowercase letters" 
                />
                <PasswordRequirement 
                  met={/\d/.test(formData.password)} 
                  text="Contains numbers" 
                />
                <PasswordRequirement 
                  met={/[^a-zA-Z0-9]/.test(formData.password)} 
                  text="Special characters (!@#$%)" 
                />
              </div>
            </div>
          )}

          {/* Confirm Password Input */}
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              className="pl-11 pr-11"
            />
            <Lock className="absolute left-4 top-[42px] w-5 h-5 text-[#9CA3AF] pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-[42px] text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors z-10"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
            {isValid.confirmPassword && touched.confirmPassword && (
              <div className="absolute right-14 top-[42px] text-[#10B981]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start gap-2 text-xs text-[#9CA3AF]">
            <input
              type="checkbox"
              id="terms"
              className="mt-0.5 rounded border-white/10 bg-[#111827] text-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/50"
              required
            />
            <label htmlFor="terms">
              I agree to the{' '}
              <a href="#" className="text-[#3B82F6] hover:text-[#60A5FA]">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-[#3B82F6] hover:text-[#60A5FA]">
                Privacy Policy
              </a>
            </label>
          </div>

          {/* Register Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full group"
          >
            <span>Create Account</span>
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

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-[#9CA3AF]">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-[#3B82F6] hover:text-[#60A5FA] font-medium transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
            <Shield className="w-4 h-4 text-[#10B981]" />
            <span>All data encrypted with AES-256 encryption</span>
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

interface PasswordRequirementProps {
  met: boolean;
  text: string;
}

function PasswordRequirement({ met, text }: PasswordRequirementProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={cn(
        'w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200',
        met ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#374151] text-[#6B7280]'
      )}>
        {met ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      </div>
      <span className={cn(
        'transition-colors duration-200',
        met ? 'text-[#10B981]' : 'text-[#9CA3AF]'
      )}>
        {text}
      </span>
    </div>
  );
}