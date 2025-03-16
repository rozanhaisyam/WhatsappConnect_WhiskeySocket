import { Card } from "@/components/ui/card";

interface QRDisplayProps {
  qrCode: string;
}

export default function QRDisplay({ qrCode }: QRDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-lg font-medium">Scan QR Code</h3>
      <Card className="p-4 bg-white">
        <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
      </Card>
      <p className="text-sm text-muted-foreground">
        Open WhatsApp on your phone and scan this code to connect
      </p>
    </div>
  );
}
