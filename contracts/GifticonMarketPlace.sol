// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IGifticonNFT {
    enum Status {
        Listed,
        Redeemed,
        Penalized
    }

    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
    function gifticons(
        uint256 tokenId
    )
        external
        view
        returns (
            address originalOwner,
            uint256 depositAmount,
            string memory ipfsHash,
            Status status,
            uint256 burnTimestamp
        );
}

contract GifticonMarketplace is ReentrancyGuard, Ownable {
    struct Listing {
        address seller;
        uint256 price;
    }

    IGifticonNFT public gifticonNFT;

    mapping(uint256 => Listing) public listings;
    uint256[] public listedTokenIds;

    event ItemListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event ItemCanceled(uint256 indexed tokenId);
    event ItemSold(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price
    );

    constructor(address _gifticonNFT) Ownable(msg.sender) {
        gifticonNFT = IGifticonNFT(_gifticonNFT);
    }

    // 판매 등록
    function listItem(uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than 0");
        require(gifticonNFT.ownerOf(tokenId) == msg.sender, "Not the owner");

        (, , , IGifticonNFT.Status status, ) = gifticonNFT.gifticons(tokenId);
        require(status == IGifticonNFT.Status.Listed, "Not in Listed state");

        listings[tokenId] = Listing({seller: msg.sender, price: price});
        listedTokenIds.push(tokenId);

        emit ItemListed(tokenId, msg.sender, price);
    }

    // 판매 취소
    function cancelListing(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not the seller");

        delete listings[tokenId];
        _removeTokenId(tokenId);

        emit ItemCanceled(tokenId);
    }

    // 구매
    function buyItem(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.price > 0, "Not listed");
        require(msg.value >= listing.price, "Insufficient payment");

        address seller = listing.seller;
        delete listings[tokenId];
        _removeTokenId(tokenId);

        gifticonNFT.safeTransferFrom(seller, msg.sender, tokenId);
        payable(seller).transfer(listing.price);

        emit ItemSold(tokenId, msg.sender, listing.price);
    }

    // 판매 중인 토큰 ID 목록 조회
    function getListings() external view returns (uint256[] memory) {
        return listedTokenIds;
    }

    // 내부: 배열에서 tokenId 제거
    function _removeTokenId(uint256 tokenId) internal {
        uint256 length = listedTokenIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (listedTokenIds[i] == tokenId) {
                listedTokenIds[i] = listedTokenIds[length - 1];
                listedTokenIds.pop();
                break;
            }
        }
    }

    // 오너가 마켓플레이스에 남은 잔고 회수
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
