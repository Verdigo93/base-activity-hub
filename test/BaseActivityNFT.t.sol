// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/BaseActivity.sol";

/**
 * Dependency-free Foundry unit tests for the three ERC-721 rarity tiers.
 * Uses mock six-decimal USDC only inside isolated Foundry test EVM.
 */
contract BaseActivityNFTTest is IERC721Receiver {
    address private constant PAYOUT = address(0xBEEF);

    function onERC721Received(
        address, address, uint256, bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function deployNFT() internal returns (TestOnlySixDecimalToken token, BaseActivityNFT nft) {
        token = new TestOnlySixDecimalToken();
        string[3] memory urls = [
            string("https://base-activity-hub.onrender.com/metadata/genesis.json"),
            string("https://base-activity-hub.onrender.com/metadata/ember.json"),
            string("https://base-activity-hub.onrender.com/metadata/crown.json")
        ];
        nft = new BaseActivityNFT(address(token), PAYOUT, urls);
    }

    function testTierPricesAndMaxSupply() public {
        (, BaseActivityNFT nft) = deployNFT();
        require(nft.mintPrice(0) == 100_000, "Common price mismatch");
        require(nft.mintPrice(1) == 500_000, "Rare price mismatch");
        require(nft.mintPrice(2) == 1_000_000, "Legendary price mismatch");
        require(nft.tierMaxSupply(0) == 10_000, "Common cap mismatch");
        require(nft.tierMaxSupply(1) == 1_000, "Rare cap mismatch");
        require(nft.tierMaxSupply(2) == 100, "Legendary cap mismatch");
        require(nft.creator() == address(this), "Creator not deployer");
        require(nft.treasury() == PAYOUT, "Wrong payout");
    }

    function testMintEachTierSendsNftToPurchaserAndUSDCToTreasury() public {
        (TestOnlySixDecimalToken token, BaseActivityNFT nft) = deployNFT();
        token.claim();
        require(token.approve(address(nft), 1_600_000), "Approve failed");
        uint256 commonId = nft.mint(0);
        uint256 rareId = nft.mint(1);
        uint256 legendaryId = nft.mint(2);

        require(commonId == 1 && rareId == 2 && legendaryId == 3, "Unexpected IDs");
        require(nft.ownerOf(commonId) == address(this), "Common recipient wrong");
        require(nft.ownerOf(rareId) == address(this), "Rare recipient wrong");
        require(nft.ownerOf(legendaryId) == address(this), "Legendary recipient wrong");
        require(nft.balanceOf(address(this)) == 3, "Collector balance wrong");
        require(token.balanceOf(PAYOUT) == 1_600_000, "Treasury fee mismatch");
        require(nft.mintedPerTier(0) == 1 && nft.mintedPerTier(1) == 1 && nft.mintedPerTier(2) == 1, "Tier counts wrong");
        require(
            keccak256(bytes(nft.tokenURI(legendaryId))) ==
            keccak256(bytes("https://base-activity-hub.onrender.com/metadata/crown.json")),
            "Metadata URL mismatch"
        );
    }

    function testMissingAllowanceRevertsWithoutChargingOrMinting() public {
        (TestOnlySixDecimalToken token, BaseActivityNFT nft) = deployNFT();
        token.claim();
        try nft.mint(0) returns (uint256) {
            revert("Must fail without USDC allowance");
        } catch {
            require(nft.mintedPerTier(0) == 0, "Mint count not rolled back");
            require(token.balanceOf(PAYOUT) == 0, "Treasury changed");
            require(nft.balanceOf(address(this)) == 0, "Unexpected minted NFT");
        }
    }

    function testWrongTierRevertsBeforeTakingUSDC() public {
        (TestOnlySixDecimalToken token, BaseActivityNFT nft) = deployNFT();
        token.claim();
        token.approve(address(nft), 1_000_000);
        try nft.mint(3) returns (uint256) {
            revert("Invalid tier was accepted");
        } catch {
            require(token.balanceOf(PAYOUT) == 0, "Unexpected charge");
        }
    }
}
