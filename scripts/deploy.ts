import { ethers } from "hardhat";

async function main() {
  const subscription = await ethers.deployContract("Subscription", [
      process.env.OWNER_ADDRESS,
      process.env.MANAGER_ADDRESS,
  ]);

  await subscription.waitForDeployment();

  console.log(
    `Contract was deployed to ${subscription.target}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});