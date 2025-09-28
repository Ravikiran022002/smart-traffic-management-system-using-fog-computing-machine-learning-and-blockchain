import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import KpiCard from "@/components/dashboard/KpiCard";
import TrafficMap from "@/components/dashboard/TrafficMap";
import AttackSimulationCard from "@/components/dashboard/AttackSimulationCard";
import RsuTrustOverlay from "@/components/dashboard/map/RsuTrustOverlay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Radio, AlertTriangle, Shield, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { fetchVehicles, fetchRSUs, fetchAnomalies, fetchTrustLedger, fetchCongestionData } from "@/services/api";
import { seedDatabaseWithTestData } from "@/services/api/supabase";
import { updateRsuTrustScores } from "@/services/ml/rsuTrustScoring";

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rsus, setRsus] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [trustLedger, setTrustLedger] = useState<any[]>([]);
  const [congestionData, setCongestionData] = useState<any[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSeeding, setIsSeeding] = useState(false);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      console.log("Loading all dashboard data...");
      
      const [vehiclesResult, rsusResult, anomaliesResult, trustResult, congestionResult] = 
        await Promise.allSettled([
          fetchVehicles({ limit: 1000 }),
          fetchRSUs({ limit: 100 }),
          fetchAnomalies({ limit: 500 }),
          fetchTrustLedger({ limit: 500 }),
          fetchCongestionData({ limit: 100 })
        ]);
      
      if (vehiclesResult.status === 'fulfilled') {
        console.log(`Loaded ${vehiclesResult.value?.length || 0} vehicles`);
        setVehicles(Array.isArray(vehiclesResult.value) ? vehiclesResult.value : []);
      }
      
      if (rsusResult.status === 'fulfilled') {
        console.log(`Loaded ${rsusResult.value?.length || 0} RSUs`);
        const loadedRsus = Array.isArray(rsusResult.value) ? rsusResult.value : [];
        
        // Set default trust scores for RSUs without them
        const rsusWithTrust = loadedRsus.map(rsu => ({
          ...rsu,
          trust_score: rsu.trust_score || 90,
          trust_score_change: rsu.trust_score_change || 0,
          attack_detected: rsu.attack_detected || false,
          quarantined: rsu.quarantined || false
        }));
        
        setRsus(rsusWithTrust);
      }
      
      if (anomaliesResult.status === 'fulfilled') {
        console.log(`Loaded ${anomaliesResult.value?.length || 0} anomalies`);
        setAnomalies(Array.isArray(anomaliesResult.value) ? anomaliesResult.value : []);
      }
      
      if (trustResult.status === 'fulfilled') {
        console.log(`Loaded ${trustResult.value?.length || 0} trust ledger entries`);
        setTrustLedger(Array.isArray(trustResult.value) ? trustResult.value : []);
      }
      
      if (congestionResult.status === 'fulfilled') {
        console.log(`Loaded ${congestionResult.value?.length || 0} congestion data points`);
        setCongestionData(Array.isArray(congestionResult.value) ? congestionResult.value : []);
      }
      
      const failedRequests = [vehiclesResult, rsusResult, anomaliesResult, trustResult, congestionResult]
        .filter(result => result.status === 'rejected');
      
      if (failedRequests.length > 0) {
        console.error("Some data failed to load:", failedRequests);
        toast({
          title: "Some data failed to load",
          description: "Some dashboard data couldn't be retrieved. Please refresh to try again.",
          variant: "destructive",
        });
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Process anomalies to update RSU trust scores
  useEffect(() => {
    // Only process if we have both RSUs and anomalies loaded
    if (rsus.length > 0 && anomalies.length > 0 && !isLoading) {
      // Update RSU trust scores based on loaded anomalies
      updateRsuTrustScores(rsus, anomalies).then(updatedRsus => {
        setRsus(updatedRsus);
      });
    }
  }, [rsus.length, anomalies.length, isLoading]);

  const seedDatabase = async () => {
    setIsSeeding(true);
    toast({
      title: "Seeding Database",
      description: "Please wait while we populate the database with sample data...",
    });
    
    try {
      const result = await seedDatabaseWithTestData(true);
      toast({
        title: "Database Seeded Successfully",
        description: `Added ${result.counts.vehicles} vehicles, ${result.counts.rsus} RSUs, ${result.counts.anomalies} anomalies, ${result.counts.trustEntries} trust entries, and ${result.counts.congestionEntries} congestion entries.`,
      });
      
      await loadAllData();
    } catch (error) {
      console.error("Error seeding database:", error);
      toast({
        title: "Error",
        description: `Failed to seed database: ${error.message || "Unknown error"}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  
  useEffect(() => {
    if (autoRefresh && !refreshInterval) {
      const interval = setInterval(() => {
        loadAllData();
      }, 30000);
      setRefreshInterval(interval);
    } else if (!autoRefresh && refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, refreshInterval, loadAllData]);

  const getLastUpdatedText = () => {
    return lastUpdated.toLocaleTimeString();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  return (
    <MainLayout>
      <div className="flex flex-col space-y-6">
        {/* Header with title and controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hyderabad Traffic Trust Platform</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">BETA</span>
              <span className="text-xs text-muted-foreground">v1.0.0</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              Last updated: {getLastUpdatedText()}
            </div>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>{autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Now</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={seedDatabase}
              disabled={isSeeding}
              className="flex items-center gap-2"
            >
              <Database className={`h-4 w-4 ${isSeeding ? 'animate-pulse' : ''}`} />
              <span>{isSeeding ? 'Seeding...' : 'Seed Database'}</span>
            </Button>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="Total Vehicles" 
            value={vehicles.length}
            isLoading={isLoading}
            icon={Car}
            trend={{
              value: vehicles.length > 100 ? "+12%" : "+0%",
              label: vehicles.length > 100 ? "from last hour" : "No change"
            }}
          />
          <KpiCard 
            title="Active RSUs" 
            value={rsus.filter(rsu => rsu.status === 'Active').length}
            total={rsus.length}
            isLoading={isLoading}
            icon={Radio}
            color="accent"
          />
          <KpiCard 
            title="Recent Anomalies" 
            value={anomalies.length}
            isLoading={isLoading}
            icon={AlertTriangle}
            color="danger"
            trend={{
              value: anomalies.filter(a => a.severity === "Critical" || a.severity === "High").length > 0 ? 
                `${anomalies.filter(a => a.severity === "Critical" || a.severity === "High").length} critical` : 
                "0 critical",
              label: "issues detected"
            }}
          />
          <KpiCard 
            title="Trust Updates" 
            value={trustLedger.length}
            isLoading={isLoading}
            icon={Shield}
            trend={{
              value: `${rsus.filter(r => r.blockchain_protected).length} RSUs`,
              label: "blockchain protected"
            }}
          />
        </div>
        
        {/* Main content area - Map and Attack Simulation */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Real-time Traffic Monitoring</CardTitle>
              <CardDescription>View and track vehicles and roadside units across Hyderabad in real-time</CardDescription>
            </CardHeader>
            <CardContent className="p-0 relative">
              <TrafficMap 
                vehicles={vehicles}
                rsus={rsus}
                isLoading={isLoading}
                congestionData={congestionData}
              />
              <RsuTrustOverlay 
                rsus={rsus}
                anomalies={anomalies}
              />
            </CardContent>
          </Card>
          
          <AttackSimulationCard
            rsus={rsus}
            isLiveMonitoring={autoRefresh}
            setRsus={setRsus}
            setAnomalies={setAnomalies}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
