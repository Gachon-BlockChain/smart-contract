// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GifticonNFT is ERC721URIStorage, IERC721Receiver, Ownable {
    uint256 public nextTokenId;

    enum Status {
        Listed,
        Redeemed,
        Penalized
    }

    struct GifticonWithId {
        uint256 tokenId;
        Gifticon gifticon;
    }

    struct Gifticon {
        address originalOwner;
        uint256 depositAmount;
        string ipfsHash; // 암호화된 기프티콘 파일의 IPFS 해시
        Status status;
        uint256 burnTimestamp; // NFT 소각 시점
    }

    mapping(uint256 => Gifticon) public gifticons;

    event GifticonRegistered(
        uint256 indexed tokenId,
        address indexed owner,
        string ipfsHash
    );
    event GifticonRedeemed(uint256 indexed tokenId, address indexed redeemer);
    event FraudReported(uint256 indexed tokenId, address indexed reporter);
    event PenaltyApplied(uint256 indexed tokenId, uint256 amountBurned);
    event TokenURIUpdated(uint256 indexed tokenId, string newURI);

    constructor() ERC721("GifticonNFT", "GFT") Ownable(msg.sender) {}

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // 1. 기프티콘 등록 + 담보 입금 + NFT 발행
    function registerGifticon(
        string memory ipfsHash,
        string memory tokenURI,
        uint256 expiryDate,
        uint256 depositAmount
    ) external payable {
        require(msg.value == depositAmount, "Incorrect deposit");

        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);

        // 토큰 URI는 비어 있어도 OK
        if (bytes(tokenURI).length > 0) {
            _setTokenURI(tokenId, tokenURI);
        }

        gifticons[tokenId] = Gifticon({
            originalOwner: msg.sender,
            depositAmount: depositAmount,
            ipfsHash: ipfsHash,
            status: Status.Listed,
            burnTimestamp: expiryDate
        });

        emit GifticonRegistered(tokenId, msg.sender, ipfsHash);
    }

    // 2. 구매자가 NFT를 컨트랙트로 보내 교환 요청
    function redeemGifticon(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        Gifticon storage g = gifticons[tokenId];
        require(g.status == Status.Listed, "Already redeemed or penalized");

        g.status = Status.Redeemed;
        g.burnTimestamp = block.timestamp;

        safeTransferFrom(msg.sender, address(this), tokenId); // ✅ 컨트랙트에 맡김
        emit GifticonRedeemed(tokenId, msg.sender);
        // 오프체인에서 해당 이벤트를 감지하여 복호화 키 제공
    }

    // 3. 사기 신고
    function reportFraud(uint256 tokenId) external {
        Gifticon storage g = gifticons[tokenId];
        require(g.status == Status.Redeemed, "Not redeemable");
        require(
            block.timestamp <= g.burnTimestamp + 1 days,
            "Report window closed"
        );

        g.status = Status.Penalized;
        uint256 penaltyAmount = g.depositAmount;
        g.depositAmount = 0;

        emit FraudReported(tokenId, msg.sender);
        emit PenaltyApplied(tokenId, penaltyAmount);
    }

    // 4. 담보 반환 (NFT 소각 1일 후 상환요청)
    function refundDeposit(uint256 tokenId) external {
        Gifticon storage g = gifticons[tokenId];
        require(g.originalOwner == msg.sender, "Not original owner");
        require(ownerOf(tokenId) == msg.sender, "You must own the NFT");
        require(g.status == Status.Listed, "Not refundable");

        // 환불 처리
        uint256 refund = g.depositAmount;
        g.depositAmount = 0;
        g.status = Status.Penalized; // 반환 처리는 등록 철회로 간주

        // NFT 소각
        _burn(tokenId);

        payable(msg.sender).transfer(refund);
    }

    // 컨트랙트에 남은 잔고 회수 (예: 수수료나 소각된 담보)
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function tokensOfOwner(
        address owner
    ) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory result = new uint256[](balance);
        uint256 count = 0;

        for (uint256 i = 0; i < nextTokenId; i++) {
            if (ownerOf(i) == owner) {
                result[count++] = i;
            }
        }

        return result;
    }

    function gifticonsWithIdOfOwner(
        address owner
    ) external view returns (GifticonWithId[] memory) {
        uint256 balance = balanceOf(owner);
        GifticonWithId[] memory result = new GifticonWithId[](balance);
        uint256 count = 0;

        for (uint256 i = 0; i < nextTokenId; i++) {
            if (ownerOf(i) == owner) {
                result[count++] = GifticonWithId({
                    tokenId: i,
                    gifticon: gifticons[i]
                });
            }
        }
        return result;
    }

    // 👇 맨 아래에 추가
    function setTokenURI(uint256 tokenId, string memory newTokenURI) external {
        require(
            ownerOf(tokenId) == msg.sender,
            "Only token owner can update URI"
        );

        _setTokenURI(tokenId, newTokenURI);
        emit TokenURIUpdated(tokenId, newTokenURI);
    }
}
