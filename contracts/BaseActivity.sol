// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Base Activity Hub — initial transparent, non-upgradeable contract templates.
 * These contracts are provided for testnet review; independent audit required before mainnet launch.
 * Fee design: EXACTLY 100000 units (0.10 of 6-decimal USDC), plus network gas.
 */
interface IERC20Payment {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

contract ActivityBoard {
    mapping(address => uint256) public gmCount;
    mapping(address => uint256) public lastCheckInDay;
    event GM(address indexed author, uint256 timestamp);
    event DailyCheckIn(address indexed author, uint256 indexed utcDay);
    event OnchainMessage(address indexed author, string message, uint256 timestamp);

    function gm() external {
        ++gmCount[msg.sender];
        emit GM(msg.sender, block.timestamp);
    }

    function dailyCheckIn() external {
        uint256 day = block.timestamp / 1 days;
        require(lastCheckInDay[msg.sender] != day, "Already checked in today");
        lastCheckInDay[msg.sender] = day;
        emit DailyCheckIn(msg.sender, day);
    }

    function postMessage(string calldata message) external {
        uint256 len = bytes(message).length;
        require(len > 0 && len <= 280, "Message must be 1-280 bytes");
        emit OnchainMessage(msg.sender, message, block.timestamp);
    }
}

/** Compact ERC-721 implementation with standard transfers, approvals, safe transfers and metadata. */
abstract contract Basic721 {
    string public name;
    string public symbol;
    uint256 public nextTokenId = 1;
    mapping(uint256 => address) internal _owners;
    mapping(address => uint256) internal _balances;
    mapping(uint256 => address) internal _approvals;
    mapping(address => mapping(address => bool)) internal _operators;
    mapping(uint256 => string) internal _uris;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    constructor(string memory n, string memory s) {name=n;symbol=s;}
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }
    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "Zero owner"); return _balances[owner];
    }
    function ownerOf(uint256 id) public view returns (address) {
        address owner = _owners[id];require(owner != address(0), "Nonexistent token");return owner;
    }
    function tokenURI(uint256 id) external view returns (string memory) {ownerOf(id);return _uris[id];}
    function getApproved(uint256 id) public view returns (address) {ownerOf(id);return _approvals[id];}
    function isApprovedForAll(address owner,address operator) public view returns (bool) {return _operators[owner][operator];}
    function approve(address to,uint256 id) external {
        address owner=ownerOf(id);require(to != owner,"Cannot approve owner");
        require(msg.sender==owner||_operators[owner][msg.sender],"Not authorized");
        _approvals[id]=to;emit Approval(owner,to,id);
    }
    function setApprovalForAll(address operator,bool approved) external {
        require(operator != msg.sender,"Cannot self-approve");
        _operators[msg.sender][operator]=approved;emit ApprovalForAll(msg.sender,operator,approved);
    }
    function transferFrom(address from,address to,uint256 id) public {
        require(to!=address(0),"Zero recipient");address owner=ownerOf(id);
        require(owner==from,"Wrong owner");
        require(msg.sender==owner||msg.sender==_approvals[id]||_operators[owner][msg.sender],"Not authorized");
        delete _approvals[id];--_balances[from];++_balances[to];_owners[id]=to;emit Transfer(from,to,id);
    }
    function safeTransferFrom(address from,address to,uint256 id) external {
        safeTransferFrom(from,to,id,"");
    }
    function safeTransferFrom(address from,address to,uint256 id,bytes memory data) public {
        transferFrom(from,to,id);
        if(to.code.length>0){
            require(IERC721Receiver(to).onERC721Received(msg.sender,from,id,data)==IERC721Receiver.onERC721Received.selector,"Receiver rejected NFT");
        }
    }
    function _mint(address to,string memory uri) internal returns(uint256 id) {
        require(to!=address(0),"Zero recipient");id=nextTokenId++;
        _owners[id]=to;++_balances[to];_uris[id]=uri;emit Transfer(address(0),to,id);
    }
}

contract BaseActivityNFT is Basic721 {
    IERC20Payment public immutable usdc;
    address public immutable treasury;
    uint256 public constant COMMON_PRICE = 100_000;
    uint256 public constant RARE_PRICE = 500_000;
    uint256 public constant LEGENDARY_PRICE = 1_000_000;
    uint256 public constant COMMON_SUPPLY = 10_000;
    uint256 public constant RARE_SUPPLY = 1_000;
    uint256 public constant LEGENDARY_SUPPLY = 100;
    uint256[3] public mintedPerTier;
    string[3] private _artworkUris;
    uint256 private _unlocked = 1;

    event Minted(address indexed collector,uint256 indexed tokenId,uint256 indexed artworkKind,uint256 priceUsdc);

    constructor(address usdcToken,address payout,string[3] memory artworkUris)
        Basic721("Base Activity Originals", "BAO") {
        require(usdcToken.code.length>0,"USDC must be deployed contract");
        require(payout!=address(0),"Treasury must be set");
        for(uint256 i=0;i<3;i++){
            require(bytes(artworkUris[i]).length>0,"Empty token URI");
        }
        usdc=IERC20Payment(usdcToken);
        treasury=payout;
        _artworkUris=artworkUris;
    }
    function mintPrice(uint256 artworkKind) public pure returns(uint256) {
        require(artworkKind<3,"Unknown artwork");
        if(artworkKind==0)return COMMON_PRICE;
        if(artworkKind==1)return RARE_PRICE;
        return LEGENDARY_PRICE;
    }
    function tierMaxSupply(uint256 artworkKind) public pure returns(uint256) {
        require(artworkKind<3,"Unknown artwork");
        if(artworkKind==0)return COMMON_SUPPLY;
        if(artworkKind==1)return RARE_SUPPLY;
        return LEGENDARY_SUPPLY;
    }
    function artworkUri(uint256 artworkKind) external view returns(string memory) {
        require(artworkKind<3,"Unknown artwork");
        return _artworkUris[artworkKind];
    }
    function mint(uint256 artworkKind) external returns(uint256 tokenId) {
        require(_unlocked==1,"Reentrant mint");
        uint256 price=mintPrice(artworkKind);
        require(mintedPerTier[artworkKind]<tierMaxSupply(artworkKind),"Tier sold out");
        _unlocked=2;
        mintedPerTier[artworkKind]+=1;
        require(usdc.transferFrom(msg.sender,treasury,price),"USDC payment failed");
        tokenId=_mint(msg.sender,_artworkUris[artworkKind]);
        if(msg.sender.code.length>0){
            require(
                IERC721Receiver(msg.sender).onERC721Received(msg.sender,address(0),tokenId,"")==IERC721Receiver.onERC721Received.selector,
                "Receiver rejected NFT"
            );
        }
        emit Minted(msg.sender,tokenId,artworkKind,price);
        _unlocked=1;
    }
}

contract UserCounter {
    string public name;
    address public immutable owner;
    uint256 public count;
    event CountIncreased(address indexed actor,uint256 newCount);
    constructor(string memory n,address user){name=n;owner=user;}
    function increment() external {++count;emit CountIncreased(msg.sender,count);}
}
contract UserGuestbook {
    string public name;
    address public immutable owner;
    event Message(address indexed author,string text);
    constructor(string memory n,address user){name=n;owner=user;}
    function write(string calldata text) external {require(bytes(text).length>0 && bytes(text).length<=280,"Too long");emit Message(msg.sender,text);}
}
contract UserStorage {
    string public name;
    address public immutable owner;
    string public content;
    event ContentChanged(string newContent);
    constructor(string memory n,address user){name=n;owner=user;}
    function set(string calldata text) external {require(msg.sender==owner,"Only owner");require(bytes(text).length<=1024,"Too long");content=text;emit ContentChanged(text);}
}
contract UserToken {
    string public name;
    string public symbol;
    uint8 public constant decimals=18;
    uint256 public totalSupply;
    mapping(address=>uint256) public balanceOf;
    mapping(address=>mapping(address=>uint256)) public allowance;
    event Transfer(address indexed from,address indexed to,uint256 value);
    event Approval(address indexed owner,address indexed spender,uint256 value);
    constructor(string memory n,string memory s,uint256 supply,address creator){
        require(creator!=address(0),"Zero creator");
        require(bytes(n).length>0 && bytes(s).length>0,"Name and symbol required");
        name=n;symbol=s;totalSupply=supply*1 ether;balanceOf[creator]=totalSupply;emit Transfer(address(0),creator,totalSupply);
    }
    function transfer(address to,uint256 amount) external returns(bool){_transfer(msg.sender,to,amount);return true;}
    function approve(address spender,uint256 amount) external returns(bool){allowance[msg.sender][spender]=amount;emit Approval(msg.sender,spender,amount);return true;}
    function transferFrom(address from,address to,uint256 amount) external returns(bool){
        uint256 allowed=allowance[from][msg.sender];require(allowed>=amount,"Allowance too low");
        if(allowed!=type(uint256).max){allowance[from][msg.sender]=allowed-amount;emit Approval(from,msg.sender,allowance[from][msg.sender]);}
        _transfer(from,to,amount);return true;
    }
    function _transfer(address from,address to,uint256 amount) internal {
        require(to!=address(0),"Zero recipient");require(balanceOf[from]>=amount,"Insufficient balance");
        balanceOf[from]-=amount;balanceOf[to]+=amount;emit Transfer(from,to,amount);
    }
}
contract UserNFTCollection is Basic721 {
    address public immutable owner;
    constructor(string memory n,string memory s,address creator) Basic721(n,s){owner=creator;}
    function mintTo(address recipient,string calldata uri) external returns(uint256){
        require(msg.sender==owner,"Only collection owner");require(bytes(uri).length<=512,"URI too long");
        return _mint(recipient,uri);
    }
}

contract BaseActivityFactory {
    IERC20Payment public immutable usdc;
    address public immutable treasury;
    uint256 public constant DEPLOY_FEE=100_000;
    event ContractDeployed(address indexed creator,address indexed deployedContract,string contractType,string name);
    constructor(address usdcToken,address payout){
        require(usdcToken.code.length>0,"USDC must be deployed contract");
        require(payout!=address(0),"Treasury must be set");usdc=IERC20Payment(usdcToken);treasury=payout;
    }
    function _fee() internal {require(usdc.transferFrom(msg.sender,treasury,DEPLOY_FEE),"USDC payment failed");}
    function _name(string memory n) internal pure {require(bytes(n).length>=3&&bytes(n).length<=48,"Invalid name length");}
    function deployCounter(string calldata n) external returns(address deployed){
        _name(n);_fee();deployed=address(new UserCounter(n,msg.sender));emit ContractDeployed(msg.sender,deployed,"Counter",n);
    }
    function deployGuestbook(string calldata n) external returns(address deployed){
        _name(n);_fee();deployed=address(new UserGuestbook(n,msg.sender));emit ContractDeployed(msg.sender,deployed,"Guestbook",n);
    }
    function deployStorage(string calldata n) external returns(address deployed){
        _name(n);_fee();deployed=address(new UserStorage(n,msg.sender));emit ContractDeployed(msg.sender,deployed,"Storage",n);
    }
    function deployToken(string calldata n,string calldata s,uint256 supply) external returns(address deployed){
        _name(n);require(bytes(s).length>=2&&bytes(s).length<=10,"Invalid symbol");
        require(supply>0&&supply<=1_000_000_000_000,"Invalid supply");
        _fee();deployed=address(new UserToken(n,s,supply,msg.sender));emit ContractDeployed(msg.sender,deployed,"ERC20",n);
    }
    function deployNFTCollection(string calldata n,string calldata s) external returns(address deployed){
        _name(n);require(bytes(s).length>=2&&bytes(s).length<=10,"Invalid symbol");
        _fee();deployed=address(new UserNFTCollection(n,s,msg.sender));emit ContractDeployed(msg.sender,deployed,"ERC721",n);
    }
}

/** Development-only token. Never advertise mock tokens as real USDC or deploy on mainnet. */
contract TestOnlySixDecimalToken {
    string public constant name="Test USDC (not real)";
    string public constant symbol="tUSDC";
    uint8 public constant decimals=6;
    mapping(address=>uint256) public balanceOf;
    mapping(address=>mapping(address=>uint256)) public allowance;
    event Transfer(address indexed from,address indexed to,uint256 value);
    event Approval(address indexed owner,address indexed spender,uint256 value);
    function claim() external {require(balanceOf[msg.sender]<20_000_000,"Claim threshold met");balanceOf[msg.sender]+=10_000_000;emit Transfer(address(0),msg.sender,10_000_000);}
    function approve(address spender,uint256 value) external returns(bool){allowance[msg.sender][spender]=value;emit Approval(msg.sender,spender,value);return true;}
    function transferFrom(address from,address to,uint256 value) external returns(bool){require(to!=address(0),"Zero address");require(balanceOf[from]>=value&&allowance[from][msg.sender]>=value,"Insufficient funds or allowance");allowance[from][msg.sender]-=value;balanceOf[from]-=value;balanceOf[to]+=value;emit Transfer(from,to,value);return true;}
    function transfer(address to,uint256 value) external returns(bool){require(to!=address(0),"Zero address");require(balanceOf[msg.sender]>=value,"Insufficient funds");balanceOf[msg.sender]-=value;balanceOf[to]+=value;emit Transfer(msg.sender,to,value);return true;}
}
