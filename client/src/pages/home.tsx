import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import QRDisplay from "@/components/qr-display";
import ConnectionStatus from "@/components/connection-status";
import MessageForm from "@/components/message-form";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { toast } = useToast();

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/status"],
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/connect");
    },
    onSuccess: () => {
      refetchStatus();
      toast({
        title: "Connecting to WhatsApp",
        description: "Please scan the QR code when it appears",
      });
    },
    onError: () => {
      toast({
        title: "Connection Error",
        description: "Failed to initiate WhatsApp connection",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/disconnect");
    },
    onSuccess: () => {
      refetchStatus();
      toast({
        title: "Disconnected",
        description: "WhatsApp connection closed",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConnectionStatus status={status} />
            
            <div className="flex gap-4">
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={status?.isConnected || connectMutation.isPending}
              >
                Connect
              </Button>
              
              <Button
                onClick={() => disconnectMutation.mutate()}
                disabled={!status?.isConnected || disconnectMutation.isPending}
                variant="destructive"
              >
                Disconnect
              </Button>
            </div>

            {status?.qrCode && <QRDisplay qrCode={status.qrCode} />}
          </CardContent>
        </Card>

        {status?.isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Send Message</CardTitle>
            </CardHeader>
            <CardContent>
              <MessageForm />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
