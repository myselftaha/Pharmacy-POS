import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, ShieldAlert, Pill, Stethoscope, Syringe, Heart, Microscope, Thermometer, Droplets, Zap, Activity, Plus, Minus } from 'lucide-react';
import { useSnackbar } from 'notistack';
import API_URL from '../config/api';

// Animated background component with more interactive elements
const AnimatedBackground = () => {
  // Icons to animate in the background
  const icons = [
    { Icon: Pill, size: 24, duration: 20, delay: 0, rotation: 360 },
    { Icon: Stethoscope, size: 32, duration: 25, delay: 2, rotation: 180 },
    { Icon: Syringe, size: 28, duration: 30, delay: 5, rotation: 270 },
    { Icon: Heart, size: 20, duration: 15, delay: 7, rotation: 360 },
    { Icon: Microscope, size: 36, duration: 35, delay: 10, rotation: 90 },
    { Icon: Thermometer, size: 24, duration: 20, delay: 12, rotation: 180 },
    { Icon: Droplets, size: 28, duration: 25, delay: 15, rotation: 360 },
    { Icon: Zap, size: 20, duration: 18, delay: 18, rotation: 90 },
    { Icon: Pill, size: 30, duration: 22, delay: 20, rotation: 270 },
    { Icon: Stethoscope, size: 26, duration: 28, delay: 23, rotation: 180 },
    { Icon: Syringe, size: 22, duration: 17, delay: 25, rotation: 360 },
    { Icon: Heart, size: 28, duration: 24, delay: 28, rotation: 90 },
    { Icon: Activity, size: 26, duration: 26, delay: 30, rotation: 180 },
    { Icon: Plus, size: 18, duration: 20, delay: 32, rotation: 360 },
    { Icon: Minus, size: 18, duration: 22, delay: 34, rotation: 90 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {icons.map((iconData, index) => {
        const { Icon, size, duration, delay, rotation } = iconData;
        const randomX = Math.random() * 100;
        const randomY = Math.random() * 100;
        const randomOpacity = 0.1 + Math.random() * 0.2;
        
        return (
          <div
            key={index}
            className="absolute text-green-500 opacity-20 hover:opacity-40 transition-opacity duration-300 cursor-pointer"
            style={{
              left: `${randomX}%`,
              top: `${randomY}%`,
              animation: `float ${duration}s ease-in-out infinite, rotate ${duration/2}s linear infinite`,
              animationDelay: `${delay}s`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Icon size={size} />
          </div>
        );
      })}
      
      {/* Interactive molecules */}
      <div className="absolute top-1/4 left-1/4 w-4 h-4 rounded-full bg-blue-400/30 animate-pulse"></div>
      <div className="absolute top-3/4 right-1/4 w-6 h-6 rounded-full bg-emerald-400/30 animate-bounce"></div>
      <div className="absolute bottom-1/3 left-1/3 w-3 h-3 rounded-full bg-green-300/30 animate-ping"></div>
      
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/10"></div>
    </div>
  );
};

const LoginPage = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [inputFocus, setInputFocus] = useState({ username: false, password: false });
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                enqueueSnackbar('Login Successful', { variant: 'success' });
                navigate('/');
            } else {
                enqueueSnackbar(data.message || 'Login failed', { variant: 'error' });
            }
        } catch (err) {
            enqueueSnackbar('Network error: Could not connect to backend', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Interactive health monitor effect
    const HealthMonitor = () => (
        <div className="absolute top-4 right-4 w-24 h-24 hidden md:block">
            <div className="relative w-full h-full">
                <div className="absolute inset-0 rounded-full border-4 border-green-500/20"></div>
                <div className="absolute inset-2 rounded-full border-2 border-emerald-400/30 animate-ping"></div>
                <div className="absolute inset-4 rounded-full border border-green-300/40"></div>
                <Heart className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-500 animate-pulse" size={24} />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-green-500 animate-bounce"></div>
            </div>
        </div>
    );

    // Interactive DNA strand effect
    const DnaStrand = () => (
        <div className="absolute bottom-8 left-8 hidden lg:block">
            <div className="flex space-x-2">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex flex-col space-y-1">
                        <div 
                            className="w-2 h-2 rounded-full bg-green-400/50"
                            style={{ animation: `dna 3s infinite ${i * 0.2}s` }}
                        ></div>
                        <div 
                            className="w-2 h-2 rounded-full bg-emerald-400/50"
                            style={{ animation: `dna 3s infinite ${i * 0.2 + 1.5}s` }}
                        ></div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900 flex items-center justify-center p-4 relative overflow-hidden">
            <AnimatedBackground />
            <HealthMonitor />
            <DnaStrand />
            
            {/* Floating particles effect with more interaction */}
            <div className="absolute inset-0">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-green-400/10 hover:bg-green-300/20 transition-all duration-500 cursor-pointer"
                        style={{
                            width: Math.random() * 15 + 3,
                            height: Math.random() * 15 + 3,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `pulse ${Math.random() * 5 + 3}s infinite alternate, float-diagonal ${Math.random() * 20 + 10}s infinite linear`,
                            animationDelay: `${Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>
            
            <div className="max-w-md w-full bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20 relative z-10 transform transition-all duration-500 hover:scale-[1.02]">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/10"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                    
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20 animate-pulse">
                            <Lock size={32} className="animate-spin-slow" />
                        </div>
                        <h1 className="text-2xl font-bold italic tracking-tight animate-fade-in">MedKit POS</h1>
                        <p className="text-green-100 text-sm mt-1 animate-fade-in-delay">Pharmacy Management System</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                            <div className={`relative transition-all duration-300 ${inputFocus.username ? 'scale-[1.02]' : ''}`}>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <User size={18} className={inputFocus.username ? 'text-green-500' : ''} />
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    value={credentials.username}
                                    onChange={handleChange}
                                    onFocus={() => setInputFocus({ ...inputFocus, username: true })}
                                    onBlur={() => setInputFocus({ ...inputFocus, username: false })}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white/80 backdrop-blur-sm hover:shadow-md"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                            <div className={`relative transition-all duration-300 ${inputFocus.password ? 'scale-[1.02]' : ''}`}>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Lock size={18} className={inputFocus.password ? 'text-green-500' : ''} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    value={credentials.password}
                                    onChange={handleChange}
                                    onFocus={() => setInputFocus({ ...inputFocus, password: true })}
                                    onBlur={() => setInputFocus({ ...inputFocus, password: false })}
                                    className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white/80 backdrop-blur-sm hover:shadow-md"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors"
                                >
                                    {showPassword ? <Minus size={18} /> : <Plus size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-green-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 relative overflow-hidden group"
                    >
                        <span className="absolute inset-0 bg-white/20 transform scale-x-0 transition-transform duration-500 group-hover:scale-x-100"></span>
                        <span className="absolute -inset-1 bg-gradient-to-r from-green-400/30 to-emerald-400/30 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                        <span className="relative flex items-center gap-2">
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                'Secure Login'
                            )}
                        </span>
                    </button>

                    <div className="flex items-center gap-2 justify-center text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-4 animate-fade-in-delay">
                        <ShieldAlert size={12} />
                        Authorized Personnel Only
                    </div>
                </form>
            </div>
            
            {/* Custom styles for animations */}
            <style jsx>{`
                @keyframes float {
                    0% {
                        transform: translate(-50%, -50%) translateY(0) rotate(0deg);
                        opacity: 0.1;
                    }
                    50% {
                        transform: translate(-50%, -50%) translateY(-20px) rotate(180deg);
                        opacity: 0.2;
                    }
                    100% {
                        transform: translate(-50%, -50%) translateY(0) rotate(360deg);
                        opacity: 0.1;
                    }
                }
                
                @keyframes rotate {
                    0% {
                        transform: translate(-50%, -50%) rotate(0deg);
                    }
                    100% {
                        transform: translate(-50%, -50%) rotate(360deg);
                    }
                }
                
                @keyframes pulse {
                    0% {
                        transform: scale(1);
                        opacity: 0.1;
                    }
                    100% {
                        transform: scale(1.5);
                        opacity: 0.3;
                    }
                }
                
                @keyframes float-diagonal {
                    0% {
                        transform: translate(0, 0);
                    }
                    25% {
                        transform: translate(20px, 20px);
                    }
                    50% {
                        transform: translate(0, 40px);
                    }
                    75% {
                        transform: translate(-20px, 20px);
                    }
                    100% {
                        transform: translate(0, 0);
                    }
                }
                
                @keyframes dna {
                    0%, 100% {
                        transform: translateY(0);
                        opacity: 0.5;
                    }
                    50% {
                        transform: translateY(-10px);
                        opacity: 1;
                    }
                }
                
                @keyframes spin-slow {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
                
                @keyframes fade-in {
                    0% {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fade-in-delay {
                    0% {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    50% {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                
                .animate-fade-in {
                    animation: fade-in 1s ease-out forwards;
                }
                
                .animate-fade-in-delay {
                    animation: fade-in-delay 1.5s ease-out forwards;
                }
                
                .bg-grid-white\\/10 {
                    background-image: 
                        linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;