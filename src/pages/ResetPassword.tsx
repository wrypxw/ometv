import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Also listen for auth state change with recovery event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      // Give it a moment then check session
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setReady(true);
      }, 1000);
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleReset = async () => {
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Senha redefinida com sucesso!");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#08080e" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: "rgba(20, 20, 35, 0.95)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            <svg width="28" height="21" viewBox="0 0 36 28" fill="none">
              <ellipse cx="11" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
              <ellipse cx="25" cy="14" rx="8" ry="7" stroke="white" strokeWidth="2" fill="none" />
              <path d="M16 9 C17 7, 19 7, 20 9" stroke="#f97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Redefinir Senha</h1>
          <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Digite sua nova senha abaixo
          </p>
        </div>

        {!ready ? (
          <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
            Verificando link de recuperação...
          </p>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-3 px-4 rounded-xl text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-purple-500/50"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <input
              type="password"
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReset()}
              className="w-full py-3 px-4 rounded-xl text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-purple-500/50"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
            {message && <p className="text-xs" style={{ color: "#22c55e" }}>{message}</p>}
            <button
              onClick={handleReset}
              disabled={loading || !password || !confirmPassword}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
            >
              {loading ? "..." : "Redefinir Senha"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full py-2 text-xs"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Voltar ao Início
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
