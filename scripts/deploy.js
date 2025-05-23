const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const GifticonNFT = await ethers.getContractFactory("GifticonNFT");
  const gifticon = await GifticonNFT.deploy();
  await gifticon.waitForDeployment();
  console.log("GifticonNFT deployed to:", await gifticon.getAddress());

  const GifticonMarketplace = await ethers.getContractFactory("GifticonMarketplace");
  const marketplace = await GifticonMarketplace.deploy(await gifticon.getAddress());
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to:", await marketplace.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
