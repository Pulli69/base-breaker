// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BaseBrickBreaker {
    // ==========================================
    // 1. ERC721 BADGE LOGIC (Minimal Implementation)
    // ==========================================
    string public name = "Base Brick Breaker Badge";
    string public symbol = "BBBB";
    
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => bool) public hasBadge;
    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event BadgeMinted(address indexed player, uint256 indexed tokenId);

    function mintBadge() external {
        require(!hasBadge[msg.sender], "Already minted a badge");
        
        totalSupply++;
        uint256 tokenId = totalSupply;
        
        _balances[msg.sender] += 1;
        _owners[tokenId] = msg.sender;
        hasBadge[msg.sender] = true;
        
        emit Transfer(address(0), msg.sender, tokenId);
        emit BadgeMinted(msg.sender, tokenId);
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "ERC721: address zero is not a valid owner");
        return _balances[owner];
    }

    // ==========================================
    // 2. DAILY CHECK-IN LOGIC
    // ==========================================
    mapping(address => uint256) public lastCheckIn;
    event CheckedIn(address indexed player, uint256 timestamp);

    function checkIn() external {
        require(block.timestamp >= lastCheckIn[msg.sender] + 1 days, "Can only check in once every 24 hours");
        lastCheckIn[msg.sender] = block.timestamp;
        emit CheckedIn(msg.sender, block.timestamp);
    }

    // ==========================================
    // 3. SCORE LEADERBOARD LOGIC
    // ==========================================
    struct PlayerScore {
        address player;
        uint256 score;
        uint256 levelReached;
        uint256 timestamp;
    }

    mapping(address => PlayerScore) public bestScores;
    address[] public allPlayers;
    mapping(address => bool) public hasSubmitted;

    event ScoreSubmitted(address indexed player, uint256 score, uint256 levelReached, uint256 timestamp);

    function submitScore(uint256 score, uint256 levelReached) external {
        PlayerScore memory currentBest = bestScores[msg.sender];
        if (score > currentBest.score) {
            if (!hasSubmitted[msg.sender]) {
                allPlayers.push(msg.sender);
                hasSubmitted[msg.sender] = true;
            }
            bestScores[msg.sender] = PlayerScore(msg.sender, score, levelReached, block.timestamp);
            emit ScoreSubmitted(msg.sender, score, levelReached, block.timestamp);
        }
    }

    function getBestScore(address player) external view returns (uint256 score, uint256 levelReached, uint256 timestamp) {
        PlayerScore memory ps = bestScores[player];
        return (ps.score, ps.levelReached, ps.timestamp);
    }

    function getLeaderboard(uint256 limit) external view returns (PlayerScore[] memory) {
        require(limit > 0 && limit <= 100, "Limit must be between 1 and 100");
        
        uint256 resultSize = allPlayers.length < limit ? allPlayers.length : limit;
        PlayerScore[] memory result = new PlayerScore[](resultSize);
        
        for (uint256 i = 0; i < allPlayers.length; i++) {
            if (i >= resultSize) break;
            result[i] = bestScores[allPlayers[i]];
        }
        
        // Simple bubble sort
        for (uint256 i = 0; i < result.length; i++) {
            for (uint256 j = i + 1; j < result.length; j++) {
                if (result[j].score > result[i].score) {
                    PlayerScore memory temp = result[i];
                    result[i] = result[j];
                    result[j] = temp;
                }
            }
        }
        
        return result;
    }
}
