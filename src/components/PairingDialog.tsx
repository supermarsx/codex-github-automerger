import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getSocketService } from '@/services/SocketService';
import { useToast } from '@/hooks/use-toast';

const PairingDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const svc = getSocketService();
    const unsubToken = svc.onPairToken(t => {
      setToken(t);
      setOpen(true);
    });
    const unsubResult = svc.onPairResult(success => {
      if (success) {
        toast({ title: 'Pairing successful!' });
        setOpen(false);
        setToken(null);
      } else {
        toast({ title: 'Pairing denied', variant: 'destructive' });
      }
    });
    return () => {
      unsubToken();
      unsubResult();
    };
  }, [toast]);

  if (!token) return null;

  const approveUrl = `http://${window.location.hostname}:3001/pairings/${token}/approve?secret=secret`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="neo-card space-y-4">
        <DialogHeader>
          <DialogTitle>Pair with Server</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Approve this pairing using:</p>
          <pre className="p-2 bg-muted rounded-md overflow-auto text-xs">{`curl -X POST ${approveUrl}`}</pre>
          <p>or open the URL above in your browser.</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)} className="neo-button-secondary">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PairingDialog;
