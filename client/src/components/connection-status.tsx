import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface ConnectionStatusProps {
  status?: {
    isConnected: boolean;
    qrAttempts: number;
  };
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  if (!status) return null;

  return (
    <div className="flex items-center gap-2">
      {status.isConnected ? (
        <>
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Connected
          </Badge>
        </>
      ) : (
        <>
          <Badge variant="destructive">
            <XCircle className="w-4 h-4 mr-1" />
            Disconnected
          </Badge>
          {status.qrAttempts > 0 && (
            <span className="text-sm text-muted-foreground">
              QR Attempts: {status.qrAttempts}/5
            </span>
          )}
        </>
      )}
    </div>
  );
}
