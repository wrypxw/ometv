import { Button } from "@/components/ui/button";
import { Video, Users, Globe, Shield, MessageCircle, Zap } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage = ({ onStart }: LandingPageProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Video className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-gradient">ChatRandom</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>12,847 online</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              Meet <span className="text-gradient">strangers</span>,<br />
              make <span className="text-gradient">friends</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              Connect with random people around the world via live video chat.
              One click is all it takes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onStart}
              size="lg"
              className="gradient-primary text-primary-foreground font-semibold text-lg px-10 py-6 rounded-2xl glow-primary hover:opacity-90 transition-all"
            >
              <Video className="w-5 h-5 mr-2" />
              Start Chatting
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            By using this service, you agree to our Terms of Service and Privacy Policy.
            You must be 18+ to use this platform.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          {[
            { icon: Globe, title: "Global Reach", desc: "Connect with people from 190+ countries worldwide" },
            { icon: Shield, title: "Safe & Moderated", desc: "AI-powered moderation keeps conversations safe" },
            { icon: Zap, title: "Instant Connect", desc: "No registration required, start chatting immediately" },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-card/50 border border-border/50 rounded-2xl p-6 text-center space-y-3 hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary mx-auto flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-6 text-center text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <span>© 2026 ChatRandom</span>
          <button className="hover:text-foreground transition-colors">Terms</button>
          <button className="hover:text-foreground transition-colors">Privacy</button>
          <button className="hover:text-foreground transition-colors">Safety</button>
          <button className="hover:text-foreground transition-colors">Contact</button>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
