import { useState } from "react";
import LandingPage from "@/components/LandingPage";
import VideoChatRoom from "@/components/VideoChatRoom";

const Index = () => {
  const [inChat, setInChat] = useState(false);

  if (inChat) {
    return <VideoChatRoom onExit={() => setInChat(false)} />;
  }

  return <LandingPage onStart={() => setInChat(true)} />;
};

export default Index;
