import { useState, useEffect } from "react";

const AgeVerification = ({ onVerified }: { onVerified: () => void }) => {
  const handleYes = () => {
    localStorage.setItem("age_verified", "true");
    onVerified();
  };

  const handleNo = () => {
    window.location.href = "https://www.google.com";
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-gray-900 p-8 text-center shadow-2xl border border-gray-700">
        <div className="mb-4 text-5xl">🔞</div>
        <h2 className="mb-3 text-2xl font-bold text-white">Verificação de Idade</h2>
        <p className="mb-6 text-gray-300 text-sm leading-relaxed">
          Este site contém conteúdo destinado exclusivamente para maiores de 18 anos.
          Ao continuar, você confirma que tem 18 anos ou mais.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleYes}
            className="w-full rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500 active:scale-95"
          >
            ✅ Sim, tenho mais de 18 anos
          </button>
          <button
            onClick={handleNo}
            className="w-full rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 active:scale-95"
          >
            ❌ Não tenho mais de 18 anos
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgeVerification;
