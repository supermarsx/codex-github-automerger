import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Settings, CheckCircle, AlertCircle } from 'lucide-react';

export const SecurityManagement: React.FC = () => {
  return (
    <Card className="neo-card">
      <CardHeader>
        <CardTitle className="text-2xl font-black flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Security Configuration
        </CardTitle>
        <CardDescription className="font-bold">
          Configure security settings for your automerger
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="neo-card p-4 neo-purple">
            <h4 className="font-black text-lg mb-2 text-black">Passkey Authentication</h4>
            <p className="text-sm text-black font-bold mb-4">
              Enable passkey authentication for enhanced security
            </p>
            <Button className="neo-button bg-black text-white">
              <Lock className="w-4 h-4 mr-2" />
              Configure Passkey
            </Button>
          </div>
          
          <div className="neo-card p-4 neo-orange">
            <h4 className="font-black text-lg mb-2 text-black">Webhook Security</h4>
            <p className="text-sm text-black font-bold mb-4">
              Secure your GitHub webhooks with encryption
            </p>
            <Button className="neo-button bg-black text-white">
              <Settings className="w-4 h-4 mr-2" />
              Configure Webhooks
            </Button>
          </div>
        </div>
        
        <div className="neo-card p-4 neo-pink">
          <h4 className="font-black text-lg mb-2 text-black">Security Status</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-black">API Keys Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-black">Secure Repository Access</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="font-bold text-black">Passkey Authentication Pending</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};