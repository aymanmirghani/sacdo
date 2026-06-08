import { useNavigate } from 'react-router-dom';

export default function WelcomePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-[#1a3a5c] p-6">
      <img src="/logo-transparent.png" alt="SACDO" className="w-40 h-40 object-contain mb-8" />
      <p className="text-blue-200 mb-12 text-center">Membership Management</p>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 rounded-xl bg-[#c8a951] text-[#1a3a5c] font-semibold text-lg"
        >
          Sign In
        </button>
        <button
          onClick={() => navigate('/register')}
          className="w-full py-3 rounded-xl border border-white text-white font-semibold text-lg"
        >
          Register
        </button>
      </div>
    </div>
  );
}
