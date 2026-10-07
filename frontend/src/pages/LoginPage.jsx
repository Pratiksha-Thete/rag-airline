import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';
import backgroundImage from '../assets/Aeroplane2.jpg';
import { 
  FiMail, 
  FiLock, 
  FiUser, 
  FiArrowRight,
  FiAlertCircle,
  FiCheckCircle,
  FiChevronLeft
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      
      if (isForgotPassword) {
        result = await resetPassword(email);
        if (result.success) {
          setError('Check your email for password reset instructions');
          setIsForgotPassword(false);
          return;
        }
      } else if (isSignUp) {
        result = await signUp(email, password, name);
      } else {
        result = await signIn(email, password);
      }

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Left Side - Background Image with Overlay */}
      <div className="login-background">
        <div 
          className="background-image"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className="background-overlay">
            <div className="background-content">
              <div className="logo-container">
                <div className="logo-icon">✈️</div>
                <h1>Airline Support</h1>
              </div>
              <p className="tagline">
                Elevate your airline operations with our intuitive support platform
              </p>
              <div className="features">
                <div className="feature">
                  <div className="feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Real-time flight management</span>
                </div>
                <div className="feature">
                  <div className="feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Passenger support system</span>
                </div>
                <div className="feature">
                  <div className="feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>Crew scheduling & management</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-form-container">
        <div className="login-form-wrapper">
          {/* Back Button for Forgot Password */}
          {isForgotPassword && (
            <button 
              className="back-button"
              onClick={() => setIsForgotPassword(false)}
            >
              <FiChevronLeft size={20} />
              Back to Sign In
            </button>
          )}

          <div className="form-header">
            <h2>
              {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Welcome Back')}
            </h2>
            <p className="form-subtitle">
              {isForgotPassword 
                ? 'Enter your email to receive reset instructions'
                : isSignUp 
                ? 'Create your account to get started'
                : 'Sign in to continue to your dashboard'
              }
            </p>
          </div>

          {/* Error/Success Message */}
          {error && (
            <div className={`message ${error.includes('Check your email') ? 'success' : 'error'}`}>
              {error.includes('Check your email') ? <FiCheckCircle /> : <FiAlertCircle />}
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In */}
          {!isForgotPassword && (
            <>
              <button
                onClick={handleGoogleSignIn}
                className="google-signin-btn"
                disabled={loading}
              >
                <FcGoogle size={20} />
                <span>Continue with Google</span>
              </button>

              <div className="divider">
                <span>or continue with email</span>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Name Field for Sign Up */}
            {isSignUp && !isForgotPassword && (
              <div className="input-group">
                <div className="input-icon">
                  <FiUser />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Full Name"
                  disabled={loading}
                  className="form-input"
                />
              </div>
            )}

            {/* Email Field */}
            <div className="input-group">
              <div className="input-icon">
                <FiMail />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email Address"
                disabled={loading}
                className="form-input"
              />
            </div>

            {/* Password Field */}
            {!isForgotPassword && (
              <div className="input-group">
                <div className="input-icon">
                  <FiLock />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isForgotPassword}
                  placeholder="Password"
                  minLength="6"
                  disabled={loading}
                  className="form-input"
                />
              </div>
            )}

            {/* Forgot Password Link */}
            {!isSignUp && !isForgotPassword && (
              <div className="form-options">
                <button 
                  type="button" 
                  className="forgot-password-btn"
                  onClick={() => setIsForgotPassword(true)}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              <span>
                {loading ? 'Processing...' : 
                 isForgotPassword ? 'Send Reset Instructions' : 
                 isSignUp ? 'Create Account' : 'Sign In'}
              </span>
              {!loading && <FiArrowRight className="arrow-icon" />}
            </button>
          </form>

          {/* Toggle between Sign In / Sign Up */}
          <div className="auth-toggle">
            <p>
              {isForgotPassword ? (
                <>
                  Remember your password?{' '}
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setIsSignUp(false);
                    }}
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button 
                    type="button" 
                    className="toggle-btn"
                    onClick={() => setIsSignUp(!isSignUp)}
                  >
                    {isSignUp ? 'Sign In' : 'Create Account'}
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Terms & Conditions */}
          <div className="terms">
            <p>
              By continuing, you agree to our{' '}
              <a href="/terms" className="terms-link">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" className="terms-link">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;