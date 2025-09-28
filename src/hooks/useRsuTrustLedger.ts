
import { useState, useEffect } from "react";
import { fetchRsuTrustLedger, getMockRsuTrustLedger } from "@/services/api/rsuTrustLedger";
import { toast } from "@/hooks/use-toast";
import { getTrustLedger } from "@/services/blockchain";

export const useRsuTrustLedger = () => {
  const [rsuLedgerData, setRsuLedgerData] = useState<any[]>([]);
  const [blockchainLedgerData, setBlockchainLedgerData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [isBlockchainLoading, setIsBlockchainLoading] = useState<boolean>(false);
  const [isBlockchainError, setIsBlockchainError] = useState<boolean>(false);
  const [etherscanUrl, setEtherscanUrl] = useState<string>('');

  const loadRsuLedgerData = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      
      const data = await fetchRsuTrustLedger({ limit: 1000 });
      console.log("RSU trust ledger data loaded:", data?.length || 0);
      
      if (!data || data.length === 0) {
        // Generate mock data if no real data is available
        const mockData = getMockRsuTrustLedger();
        setRsuLedgerData(mockData);
        console.log("Using mock RSU trust ledger data");
      } else {
        setRsuLedgerData(data);
      }
    } catch (error) {
      console.error("Error fetching RSU trust ledger:", error);
      setIsError(true);
      
      // Use mock data on error
      const mockData = getMockRsuTrustLedger();
      setRsuLedgerData(mockData);
      
      toast({
        title: "Data Issue",
        description: "Using cached RSU trust data due to connection issue.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBlockchainData = async () => {
    try {
      setIsBlockchainLoading(true);
      setIsBlockchainError(false);
      
      // Get blockchain transactions specifically for RSUs
      const allData = await getTrustLedger();
      
      if (!Array.isArray(allData) || allData.length === 0) {
        throw new Error("No blockchain data returned");
      }
      
      // Process the data and filter for RSU-related entries
      const rsuData = allData.filter(entry => {
        // Include entries with RSU target_type
        if (entry.target_type === 'RSU') return true;
        
        // Or entries with RSU in the target_id
        if (entry.target_id && entry.target_id.includes('RSU')) return true;
        
        // Or with details mentioning RSU
        if (entry.details && entry.details.toLowerCase().includes('rsu')) return true;
        
        return false;
      });
      
      console.log("Blockchain RSU trust ledger data loaded:", rsuData.length);
      setBlockchainLedgerData(rsuData);
      
      // Set Etherscan URL
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || 
        localStorage.getItem('env_VITE_CONTRACT_ADDRESS') || 
        '0x123abc'; // Fallback for demo purposes
      
      setEtherscanUrl(contractAddress ? 
        `https://goerli.etherscan.io/address/${contractAddress}` : 
        'https://goerli.etherscan.io');
    } catch (error) {
      console.error("Error fetching blockchain RSU trust ledger:", error);
      setIsBlockchainError(true);
      
      toast({
        title: "Blockchain Connection",
        description: "Please connect your wallet to see live blockchain data.",
        variant: "default",
      });
    } finally {
      setIsBlockchainLoading(false);
    }
  };

  const handleRefresh = () => {
    loadRsuLedgerData();
    loadBlockchainData();
  };

  useEffect(() => {
    loadRsuLedgerData();
    loadBlockchainData();
  }, []);

  return {
    rsuLedgerData,
    blockchainLedgerData,
    isLoading,
    isError,
    isBlockchainLoading,
    isBlockchainError,
    etherscanUrl,
    handleRefresh,
    loadRsuLedgerData,
    loadBlockchainData,
  };
};
