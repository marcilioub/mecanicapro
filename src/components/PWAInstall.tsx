import React, { useState, useEffect } from 'react';

const PWAInstall: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBtn, setShowInstallBtn] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Impede o Chrome 67 e anteriores de mostrar automaticamente o prompt
            e.preventDefault();
            // Guarda o evento para que possa ser disparado mais tarde.
            setDeferredPrompt(e);
            setShowInstallBtn(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Mostra o prompt de instalação
        deferredPrompt.prompt();

        // Espera pela resposta do usuário
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Usuário escolheu a instalação: ${outcome}`);

        // Limpa o prompt
        setDeferredPrompt(null);
        setShowInstallBtn(false);
    };

    if (!showInstallBtn) return null;

    return (
        <div className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all group"
            >
                <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">download_for_offline</span>
                Instalar Aplicativo
            </button>
        </div>
    );
};

export default PWAInstall;
