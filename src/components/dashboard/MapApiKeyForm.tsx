
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useMapApiKey } from "@/hooks/useMapApiKey";

interface MapApiKeyFormProps {
  onApiKeySet: (apiKey: string) => void;
}

const MapApiKeyForm: React.FC<MapApiKeyFormProps> = ({ onApiKeySet }) => {
  const { apiKey: currentApiKey, keyIsSet } = useMapApiKey();
  const [apiKey, setApiKey] = useState<string>("");
  const [showDialog, setShowDialog] = useState<boolean>(false);
  
  // Update our local state when the global API key changes
  useEffect(() => {
    if (currentApiKey !== undefined) {
      setApiKey(currentApiKey || "");
    }
  }, [currentApiKey]);
  
  // Show dialog automatically if no API key is set
  useEffect(() => {
    if (!keyIsSet) {
      setShowDialog(true);
    }
  }, [keyIsSet]);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      // Prevent repeated setting of the same key
      if (apiKey.trim() === currentApiKey) {
        setShowDialog(false);
        return;
      }
      
      // Ensure we're passing a non-empty string
      onApiKeySet(apiKey.trim());
      setShowDialog(false);
      
      toast({
        title: "API Key Saved",
        description: "Your Google Maps API key has been saved.",
      });
    } else {
      toast({
        title: "API Key Required",
        description: "Please enter a valid Google Maps API key.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateApiKey = () => {
    setShowDialog(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUpdateApiKey}
      >
        {currentApiKey ? "Update Maps API Key" : "Set Maps API Key"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google Maps API Key</DialogTitle>
            <DialogDescription>
              Enter your Google Maps API key to enable the traffic map functionality. 
              The key will be stored in your browser's local storage.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              placeholder="Enter your Google Maps API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
            />
            <p className="mt-2 text-xs text-gray-500">
              You can get an API key from the{" "}
              <a 
                href="https://console.cloud.google.com/google/maps-apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                Google Cloud Console
              </a>.
              Make sure to enable Maps JavaScript API and Visualization API.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKey}>Save API Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MapApiKeyForm;
