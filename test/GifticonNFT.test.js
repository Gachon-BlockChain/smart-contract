const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GifticonNFT", function () {
  let GifticonNFT, gifticon, owner, user1, user2;
  let deposit;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    deposit = ethers.parseEther("0.1");

    GifticonNFT = await ethers.getContractFactory("GifticonNFT");
    gifticon = await GifticonNFT.deploy();
  });

  it("should register a gifticon and mint NFT", async () => {
    await expect(
      gifticon
        .connect(user1)
        .registerGifticon("QmIPFS", "ipfs://token.json", 0, deposit, {
          value: deposit,
        })
    ).to.emit(gifticon, "GifticonRegistered");

    expect(await gifticon.ownerOf(0)).to.equal(user1.address);
  });

  it("should revert if incorrect deposit is sent", async () => {
    const wrongDeposit = ethers.parseEther("0.05");

    await expect(
      gifticon
        .connect(user1)
        .registerGifticon("QmWrong", "ipfs://wrong.json", 0, deposit, {
          value: wrongDeposit,
        })
    ).to.be.revertedWith("Incorrect deposit");
  });

  it("should allow redemption of gifticon", async () => {
    await gifticon
      .connect(user1)
      .registerGifticon("QmIPFS", "ipfs://token.json", 0, deposit, {
        value: deposit,
      });

    const tx = await gifticon.connect(user1).redeemGifticon(0);
    const receipt = await tx.wait();
    const gifticonAddress = (gifticon.target ??= gifticon.address);

    // 로그에서 특정 이벤트만 추출
    const event = receipt.logs
      .filter((log) => log.address === gifticonAddress) // ✅ 주소 필터
      .map((log) => {
        try {
          console.log(
            "log.address gifticon.address",
            log.address === gifticonAddress
          );
          return gifticon.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "GifticonRedeemed");

    // 검증
    expect(event).to.not.be.undefined;
    expect(event.args.tokenId).to.equal(0);
    expect(event.args.redeemer).to.equal(user1.address);
  });

  it("should refund deposit to original owner on refundDeposit", async () => {
    await gifticon
      .connect(user1)
      .registerGifticon("QmIPFS", "ipfs://token.json", 0, deposit, {
        value: deposit,
      });

    const before = await ethers.provider.getBalance(user1.address);

    const tx = await gifticon.connect(user1).refundDeposit(0);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * tx.gasPrice;

    const after = await ethers.provider.getBalance(user1.address);
    const expected = before + deposit - gasUsed;

    expect(after).to.be.closeTo(expected, ethers.parseEther("0.001")); // 오차 허용치
  });

  it("should allow fraud report within 1 day", async () => {
    await gifticon
      .connect(user1)
      .registerGifticon("QmIPFS", "ipfs://token.json", 0, deposit, {
        value: deposit,
      });
    await gifticon.connect(user1).redeemGifticon(0);

    await expect(gifticon.connect(user2).reportFraud(0))
      .to.emit(gifticon, "FraudReported")
      .and.to.emit(gifticon, "PenaltyApplied");
  });

  it("should fail fraud report after 1 day", async () => {
    await gifticon
      .connect(user1)
      .registerGifticon("QmIPFS", "ipfs://token.json", 0, deposit, {
        value: deposit,
      });
    await gifticon.connect(user1).redeemGifticon(0);

    // 시간 2일 증가
    await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await expect(gifticon.connect(user2).reportFraud(0)).to.be.revertedWith(
      "Report window closed"
    );
  });

  it("should allow owner to withdraw contract balance", async () => {
    await gifticon
      .connect(user1)
      .registerGifticon("QmIPFS", "ipfs://token.json", 0, deposit, {
        value: deposit,
      });
    await gifticon.connect(user1).redeemGifticon(0);
    await gifticon.connect(user2).reportFraud(0); // deposit stays in contract

    const before = await ethers.provider.getBalance(owner.address);
    console.log("before", before);

    const tx = await gifticon.connect(owner).withdraw();
    const receipt = await tx.wait();

    const after = await ethers.provider.getBalance(owner.address);
    console.log("after", after);

    const gasUsed = Number(receipt.cumulativeGasUsed) * Number(tx.gasPrice);
    console.log("gasUsed", gasUsed);

    const expected = Number(before) + Number(deposit);
    console.log("expected", expected);

    const actual = Number(after) + Number(gasUsed);
    console.log("actual", actual);

    expect(actual).to.be.closeTo(expected, 1e14);
  });

  it("should revert withdraw if not owner", async () => {
    await expect(gifticon.connect(user1).withdraw()).to.be.reverted;
  });

  it("should return all tokenIds owned by a user", async () => {
    await gifticon
      .connect(user1)
      .registerGifticon("QmHash1", "ipfs://1.json", 0, deposit, {
        value: deposit,
      });
    await gifticon
      .connect(user1)
      .registerGifticon("QmHash2", "ipfs://2.json", 0, deposit, {
        value: deposit,
      });
    await gifticon
      .connect(user2)
      .registerGifticon("QmHash3", "ipfs://3.json", 0, deposit, {
        value: deposit,
      });

    const tokenIds = await gifticon.tokensOfOwner(user1.address);
    expect(tokenIds.length).to.equal(2);
    expect(tokenIds.map((id) => id.toString())).to.include.members(["0", "1"]);
  });
});
