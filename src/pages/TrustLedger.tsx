
import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import WalletConnectButton from "@/components/WalletConnectButton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RefreshCw, PlusCircle, Shield, Car } from "lucide-react";
import { useVehicleTrustLedger } from "@/hooks/useVehicleTrustLedger";
import { useRsuTrustLedger } from "@/hooks/useRsuTrustLedger";
import VehicleTrustLedger from "@/components/trust/VehicleTrustLedger";
import RsuTrustLedger from "@/components/trust/RsuTrustLedger";
import BlockchainLedger from "@/components/trust/BlockchainLedger";
import StakeTrustDialog from "@/components/trust/StakeTrustDialog";
import NetworkInfo from "@/components/trust/NetworkInfo";
import { generateRsuAttacks } from "@/services/ml/rsuTrustScoring";
import { createRsuAttacks } from "@/services/api/rsuTrustLedger";
import { toast } from "@/hooks/use-toast";

const TrustLedger: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("vehicles");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  const {
    vehicleLedgerData,
    blockchainLedgerData: vehicleBlockchainData,
    isLoading: isVehicleLoading,
    isError: isVehicleError,
    isBlockchainLoading: isVehicleBlockchainLoading,
    isBlockchainError: isVehicleBlockchainError,
    etherscanUrl: vehicleEtherscanUrl,
    handleRefresh: handleVehicleRefresh,
    loadVehicleLedgerData,
    loadBlockchainData: loadVehicleBlockchainData,
  } = useVehicleTrustLedger();

  const {
    rsuLedgerData,
    blockchainLedgerData: rsuBlockchainData,
    isLoading: isRsuLoading,
    isError: isRsuError,
    isBlockchainLoading: isRsuBlockchainLoading,
    isBlockchainError: isRsuBlockchainError,
    etherscanUrl: rsuEtherscanUrl,
    handleRefresh: handleRsuRefresh,
    loadRsuLedgerData,
    loadBlockchainData: loadRsuBlockchainData,
  } = useRsuTrustLedger();

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Handle refresh based on active tab
  const handleRefresh = () => {
    if (activeTab === "vehicles") {
      handleVehicleRefresh();
    } else {
      handleRsuRefresh();
    }
  };

  // Generate simulated RSU security events
  const handleGenerateEvents = async () => {
    try {
      setIsGenerating(true);
      toast({
        title: "Generating Events",
        description: "Creating simulated RSU security events...",
      });
      
      // Generate mock RSU IDs
      const mockRsus = Array.from({ length: 5 }, (_, i) => ({
        rsu_id: `RSU-${(i + 1).toString().padStart(3, '0')}`,
        location: `Location ${i+1}`,
        status: 'Active'
      }));
      
      // Generate simulated attacks with higher probability (50% chance)
      const attacks = generateRsuAttacks(mockRsus, 0.5);
      
      if (attacks.length === 0) {
        toast({
          title: "No Events Generated",
          description: "Try again to generate security events",
          variant: "destructive",
        });
        return;
      }
      
      // Log the attacks to the console
      console.log(`Generated ${attacks.length} simulated RSU security events`);
      
      // Store the attacks in the RSU trust ledger
      try {
        const storedResults = await createRsuAttacks(attacks);
        console.log("Stored results:", storedResults);
        
        toast({
          title: "Events Generated",
          description: `Created ${attacks.length} simulated RSU security events`,
        });
      } catch (error) {
        console.error("Failed to store attacks:", error);
        toast({
          title: "Warning",
          description: "Events were generated but couldn't be fully stored. Some may still appear.",
          variant: "destructive",
        });
      }
      
      // Refresh the ledger data
      setTimeout(() => {
        loadRsuLedgerData();
      }, 1000);
    } catch (error) {
      console.error("Error generating RSU events:", error);
      toast({
        title: "Error",
        description: "Failed to generate RSU security events",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trust Ledger</h1>
            <p className="text-muted-foreground">Track trust scores for vehicles and RSUs</p>
            {activeTab === "vehicles" 
              ? vehicleEtherscanUrl && <NetworkInfo etherscanUrl={vehicleEtherscanUrl} />
              : rsuEtherscanUrl && <NetworkInfo etherscanUrl={rsuEtherscanUrl} />
            }
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={
                (activeTab === "vehicles" && (isVehicleLoading || isVehicleBlockchainLoading)) ||
                (activeTab === "rsus" && (isRsuLoading || isRsuBlockchainLoading))
              }
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${(isVehicleLoading || isRsuLoading) ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            {activeTab === "rsus" && (
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateEvents}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Generate Events</span>
              </Button>
            )}
            <WalletConnectButton />
          </div>
        </div>

        <Tabs defaultValue="vehicles" onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="vehicles" className="flex items-center gap-1">
              <Car className="h-4 w-4" />
              <span>Vehicles</span>
            </TabsTrigger>
            <TabsTrigger value="rsus" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>RSUs</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="vehicles">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Trust Ledger</CardTitle>
                  <CardDescription>
                    Historical record of trust score changes for vehicles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VehicleTrustLedger
                    data={vehicleLedgerData}
                    isLoading={isVehicleLoading}
                  />
                </CardContent>
              </Card>

              <BlockchainLedger 
                data={vehicleBlockchainData}
                isLoading={isVehicleBlockchainLoading}
                isError={isVehicleBlockchainError}
                etherscanUrl={vehicleEtherscanUrl}
                onRetry={loadVehicleBlockchainData}
                onStakeClick={() => setIsDialogOpen(true)}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="rsus">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>RSU Trust Events</CardTitle>
                  <CardDescription>
                    Security events and attacks detected on roadside units
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RsuTrustLedger
                    data={rsuLedgerData}
                    isLoading={isRsuLoading}
                  />
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <Button onClick={handleGenerateEvents} disabled={isGenerating} className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    <span>Generate Events</span>
                  </Button>
                </CardFooter>
              </Card>

              <BlockchainLedger 
                data={rsuBlockchainData}
                isLoading={isRsuBlockchainLoading}
                isError={isRsuBlockchainError}
                etherscanUrl={rsuEtherscanUrl}
                onRetry={loadRsuBlockchainData}
                onStakeClick={() => setIsDialogOpen(true)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <StakeTrustDialog 
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={() => {
            if (activeTab === "vehicles") {
              loadVehicleBlockchainData();
            } else {
              loadRsuBlockchainData();
            }
          }}
        />
      </div>
    </MainLayout>
  );
};

export default TrustLedger;
