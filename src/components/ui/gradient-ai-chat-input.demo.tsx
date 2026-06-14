"use client";

import { GradientAIChatInput } from "@/components/ui/gradient-ai-chat-input";

export default function GradientAIChatInputDemo() {
  const handleSend = (message: string) => {
    console.log("Message sent:", message);
  };

  const handleFileAttach = () => {
    console.log("File attach clicked");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8 mt-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Gradient AI Chat Input
          </h1>
        </div>

        {/* Demo */}
        <div className="space-y-6">
          <GradientAIChatInput
            placeholder="Send message..."
            onSend={handleSend}
            onFileAttach={handleFileAttach}
          />
        </div>
      </div>
    </div>
  );
}
