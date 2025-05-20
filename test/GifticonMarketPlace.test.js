const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GifticonMarketplace", function () {
  let GifticonNFT, gifticon;
  let GifticonMarketplace, marketplace;
  let owner, user1, user2;
  let deposit;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    deposit = ethers.parseEther("0.1");

    GifticonNFT = await ethers.getContractFactory("GifticonNFT");
    gifticon = await GifticonNFT.deploy();

    GifticonMarketplace = await ethers.getContractFactory("GifticonMarketplace");
    marketplace = await GifticonMarketplace.deploy(gifticon.target ?? gifticon.address);
  });

  it("should allow listing and buying through marketplace", async () => {
    // 1. user1이 기프티콘 등록
    await gifticon.connect(user1).registerGifticon("QmIPFS", "ipfs://token.json", 0, {
      value: deposit,
    });

    // 2. user1이 NFT를 marketplace에 승인
    await gifticon.connect(user1).approve(marketplace.target ?? marketplace.address, 0);

    // 3. user1이 NFT를 marketplace에 등록
    await expect(marketplace.connect(user1).listItem(0, ethers.parseEther("1")))
      .to.emit(marketplace, "ItemListed");

    // 4. user2가 NFT 구매
    const sellerBalanceBefore = await ethers.provider.getBalance(user1.address);
    const tx = await marketplace.connect(user2).buyItem(0, {
      value: ethers.parseEther("1"),
    });
    const receipt = await tx.wait();
    const gasUsed =
      receipt.gasUsed * tx.gasPrice;

    const sellerBalanceAfter = await ethers.provider.getBalance(user1.address);

    // 5. 소유권 이전 확인
    expect(await gifticon.ownerOf(0)).to.equal(user2.address);

    // 6. 판매자에게 돈 잘 들어왔는지 확인
    const profit = sellerBalanceAfter - sellerBalanceBefore;
    expect(Number(profit)).to.be.closeTo(Number(ethers.parseEther("1")), 1e14);
  });

  it("should only list tokens owned and in Listed status", async () => {
    await gifticon.connect(user1).registerGifticon("QmIPFS", "ipfs://token.json", 0, {
      value: deposit,
    });

    // 승인 없이 list 시도 → 실패
    await expect(
      marketplace.connect(user2).listItem(0, ethers.parseEther("1"))
    ).to.be.revertedWith("Not the owner");

    // user1이 redeem해서 상태 변경 → list 실패
    await gifticon.connect(user1).redeemGifticon(0);
    // await gifticon
    //   .connect(user1)
    //   .approve(marketplace.target ?? marketplace.address, 0);

    await expect(
      marketplace.connect(user1).listItem(0, ethers.parseEther("1"))
    ).to.be.revertedWith("Not the owner");
  });

  it("should allow cancelListing only by seller", async () => {
    await gifticon.connect(user1).registerGifticon("QmIPFS", "ipfs://token.json", 0, {
      value: deposit,
    });
    await gifticon
      .connect(user1)
      .approve(marketplace.target ?? marketplace.address, 0);

    await marketplace.connect(user1).listItem(0, ethers.parseEther("1"));

    // user2가 취소 시도 → 실패
    await expect(
      marketplace.connect(user2).cancelListing(0)
    ).to.be.revertedWith("Not the seller");

    // user1이 취소 → 성공
    await expect(marketplace.connect(user1).cancelListing(0)).to.emit(
      marketplace,
      "ItemCanceled"
    );
  });
});
