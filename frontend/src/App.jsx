import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Contract ABIs (simplified - include essential functions)
const REPUTATION_NFT_ABI = [
  "function mint(address user) external returns (uint256)",
  "function getReputationScore(address user) external view returns (uint256)",
  "function getReputationData(address user) external view returns (tuple(uint256 score, uint256 loansCompleted, uint256 totalBorrowed, uint256 totalRepaid, uint256 lastUpdated, uint8 currentTier))",
  "function userToTokenId(address user) external view returns (uint256)"
];

const LENDING_POOL_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function borrow(uint256 amount, uint256 duration) external returns (uint256)",
  "function repay(uint256 loanId) external payable",
  "function getBorrowingLimit(address borrower) external view returns (uint256)",
  "function getInterestRate(address borrower) external view returns (uint256)",
  "function getLoan(uint256 loanId) external view returns (tuple(address borrower, uint256 amount, uint256 interestRate, uint256 startTime, uint256 duration, uint256 amountRepaid, bool active, bool defaulted))",
  "function getBorrowerLoans(address borrower) external view returns (uint256[])",
  "function totalLiquidity() external view returns (uint256)"
];

const TRUST_CIRCLE_ABI = [
  "function createCircle(string memory name, uint256 minReputation) external returns (uint256)",
  "function getUserCircles(address user) external view returns (uint256[])",
  "function getCircleMembers(uint256 circleId) external view returns (address[])",
  "function getTrustScore(address user) external view returns (uint256)"
];

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState(null);
  const [reputationData, setReputationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Contract addresses - update after deployment
  const CONTRACT_ADDRESSES = {
    reputationNFT: "0x...", // Update with deployed address
    lendingPool: "0x...",   // Update with deployed address
    trustCircle: "0x..."    // Update with deployed address
  };

  const tierNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const tierColors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF'];

  // Connect Wallet
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!');
        return;
      }

      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);

      // Initialize contracts
      const reputationNFT = new ethers.Contract(CONTRACT_ADDRESSES.reputationNFT, REPUTATION_NFT_ABI, signer);
      const lendingPool = new ethers.Contract(CONTRACT_ADDRESSES.lendingPool, LENDING_POOL_ABI, signer);
      const trustCircle = new ethers.Contract(CONTRACT_ADDRESSES.trustCircle, TRUST_CIRCLE_ABI, signer);

      setContracts({ reputationNFT, lendingPool, trustCircle });

      // Load user data
      await loadUserData(accounts[0], { reputationNFT, lendingPool, trustCircle });
      setLoading(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setLoading(false);
    }
  };

  // Load user reputation data
  const loadUserData = async (address, contractsObj) => {
    try {
      const contracts = contractsObj || contracts;
      if (!contracts) return;

      const score = await contracts.reputationNFT.getReputationScore(address);
      if (score > 0) {
        const data = await contracts.reputationNFT.getReputationData(address);
        const borrowingLimit = await contracts.lendingPool.getBorrowingLimit(address);
        const interestRate = await contracts.lendingPool.getInterestRate(address);
        const trustScore = await contracts.trustCircle.getTrustScore(address);
        const circles = await contracts.trustCircle.getUserCircles(address);

        setReputationData({
          score: Number(data.score),
          tier: Number(data.currentTier),
          loansCompleted: Number(data.loansCompleted),
          totalBorrowed: ethers.formatEther(data.totalBorrowed),
          totalRepaid: ethers.formatEther(data.totalRepaid),
          borrowingLimit: ethers.formatEther(borrowingLimit),
          interestRate: Number(interestRate) / 100, // Convert from basis points
          trustScore: Number(trustScore),
          circles: circles.length
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Mint Reputation NFT
  const mintReputation = async () => {
    try {
      setLoading(true);
      const tx = await contracts.reputationNFT.mint(account);
      await tx.wait();
      await loadUserData(account);
      setLoading(false);
      alert('Reputation NFT minted successfully!');
    } catch (error) {
      console.error('Error minting:', error);
      setLoading(false);
      alert('Error minting NFT');
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="logo gradient-text">TrustCircle</h1>
          {!account ? (
            <button className="btn btn-primary" onClick={connectWallet} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="wallet-info">
              <span className="badge badge-success">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        {!account ? (
          <div className="hero">
            <div className="hero-content fade-in">
              <h1 className="hero-title">Decentralized Social Lending</h1>
              <p className="hero-subtitle">
                Build your on-chain reputation, join trust circles, and access uncollateralized loans
              </p>
              <button className="btn btn-primary btn-lg" onClick={connectWallet}>
                Get Started
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'dashboard' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`tab ${activeTab === 'borrow' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('borrow')}
              >
                Borrow
              </button>
              <button
                className={`tab ${activeTab === 'lend' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('lend')}
              >
                Lend
              </button>
              <button
                className={`tab ${activeTab === 'circles' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('circles')}
              >
                Trust Circles
              </button>
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="dashboard fade-in">
                {!reputationData ? (
                  <div className="glass-card text-center">
                    <h2>Welcome to TrustCircle!</h2>
                    <p className="text-secondary mb-4">Mint your Reputation NFT to get started</p>
                    <button className="btn btn-primary" onClick={mintReputation} disabled={loading}>
                      {loading ? 'Minting...' : 'Mint Reputation NFT'}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Reputation Card */}
                    <div className="glass-card reputation-card">
                      <h2 className="card-title">Your Reputation</h2>
                      <div className="reputation-display">
                        <div className="reputation-score">
                          <div
                            className="score-circle"
                            style={{
                              background: `linear-gradient(135deg, ${tierColors[reputationData.tier]}, ${tierColors[reputationData.tier]}99)`,
                              boxShadow: `0 0 40px ${tierColors[reputationData.tier]}66`
                            }}
                          >
                            <span className="score-value">{reputationData.score}</span>
                          </div>
                          <div className="tier-badge" style={{ color: tierColors[reputationData.tier] }}>
                            {tierNames[reputationData.tier]} Tier
                          </div>
                        </div>
                        <div className="reputation-stats">
                          <div className="stat-item">
                            <span className="stat-label">Loans Completed</span>
                            <span className="stat-value">{reputationData.loansCompleted}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Total Borrowed</span>
                            <span className="stat-value">{parseFloat(reputationData.totalBorrowed).toFixed(2)} ETH</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Total Repaid</span>
                            <span className="stat-value">{parseFloat(reputationData.totalRepaid).toFixed(2)} ETH</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Trust Circles</span>
                            <span className="stat-value">{reputationData.circles}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-3">
                      <div className="stat-card">
                        <div className="stat-value gradient-text">{parseFloat(reputationData.borrowingLimit).toFixed(2)} ETH</div>
                        <div className="stat-label">Borrowing Limit</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value gradient-text">{reputationData.interestRate}%</div>
                        <div className="stat-label">Your Interest Rate</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value gradient-text">{reputationData.trustScore}</div>
                        <div className="stat-label">Trust Score</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Placeholder for other tabs */}
            {activeTab === 'borrow' && (
              <div className="glass-card fade-in">
                <h2>Borrow Funds</h2>
                <p className="text-secondary">Borrow interface coming soon...</p>
              </div>
            )}

            {activeTab === 'lend' && (
              <div className="glass-card fade-in">
                <h2> Provide Liquidity</h2>
                <p className="text-secondary">Lending interface coming soon...</p>
              </div>
            )}

            {activeTab === 'circles' && (
              <div className="glass-card fade-in">
                <h2>Trust Circles</h2>
                <p className="text-secondary">Trust circles interface coming soon...</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p className="text-muted">Built with ❤️ for the hackathon • Powered by Ethereum</p>
      </footer>
    </div>
  );
}

export default App;
