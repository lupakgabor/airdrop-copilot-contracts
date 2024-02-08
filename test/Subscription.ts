import {ethers} from "hardhat";
import {loadFixture, time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {expect} from "chai";


async function deployWithSampleSubscription() {
    const [owner, manager, ...signers] = await ethers.getSigners();

    const Subscription = await ethers.getContractFactory("Subscription");

    const subscription = await Subscription.deploy(owner, manager);

    return {subscription, owner, manager, signers};
}

describe("constructor", () => {
    it("should set the owner and manager correct", async () => {
        const {subscription, owner, manager} = await loadFixture(deployWithSampleSubscription);

        expect(await subscription.owner()).to.equal(owner);
        expect(await subscription.manager()).to.equal(manager);
    });
});

describe("changeManager", () => {
    it('should change the manager', async () => {
        const {subscription, owner, signers} = await loadFixture(deployWithSampleSubscription);

        await subscription.changeManager(signers[0])

        expect(await subscription.manager()).to.equal(signers[0]);
    });
    it('should reject the change of the manager if not the owner send the transaction', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

        await expect(
            subscription.connect(manager).changeManager(signers[1])
        ).to.be.revertedWith(
            "Only the owner can perform this action."
        );

        await expect(
            subscription.connect(signers[0]).changeManager(signers[1])
        ).to.be.revertedWith(
            "Only the owner can perform this action."
        );
    });
});

describe('subscribe', () => {
    it('should reject if the amount lower than expected', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

        await expect(
            subscription.connect(signers[0]).subscribe({
                value: ethers.parseEther("0.001"),
            })
        ).to.be.revertedWith(
            "The sent amount is too low."
        );
    });

    it('should add to subscribe list if the amount greater than expected', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

        await subscription.connect(signers[0]).subscribe({
            value: ethers.parseEther("0.01"),
        })
        const subscriber = await subscription.subscriptions(signers[0]);
        const timestamp = await time.latest();

        const date = new Date(timestamp * 1000)

        date.setDate(date.getDate() + 30);

        expect(subscriber).to.equal(date.getTime() / 1000);
        expect(await ethers.provider.getBalance(subscription.target)).to.equal(
            ethers.parseEther("0.01")
        );
    });
});