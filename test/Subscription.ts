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
    it("should set the owner and manager correct and prices", async () => {
        const {subscription, owner, manager} = await loadFixture(deployWithSampleSubscription);

        expect(await subscription.owner()).to.equal(owner);
        expect(await subscription.manager()).to.equal(manager);
        expect(await subscription.basePriceWei()).to.equal(ethers.parseEther("0.05"));
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

describe('isSubscriptionActive', () => {
    it('should subscription active after subscribe', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

        await subscription.connect(signers[0]).subscribe({
            value: ethers.parseEther("0.05"),
        });

        expect(await subscription.isSubscriptionActive(signers[0])).is.true;
    });

    it('verifies subscription remains active 20 days post-subscription', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

        await subscription.connect(signers[0]).subscribe({
            value: ethers.parseEther("0.05"),
        });

        await time.increase( 20 * 24 * 60 * 60); // + 30 days

        expect(await subscription.isSubscriptionActive(signers[0])).is.true;
    });

    it('should subscription deactivated after a month', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

        await subscription.connect(signers[0]).subscribe({
            value: ethers.parseEther("0.05"),
        });

        await time.increase( 30 * 24 * 60 * 60); // + 30 days

        expect(await subscription.isSubscriptionActive(signers[0])).is.false;
    })
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
            value: ethers.parseEther("0.05"),
        })
        const subscriber = await subscription.subscriptions(signers[0]);

        await expect(subscriber).to.have.extraDays(30);
        expect(await ethers.provider.getBalance(subscription.target)).to.equal(
            ethers.parseEther("0.05")
        );
    });

    it('should allow to pay lower price if the user has a 20% discount', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);
        await subscription.connect(manager).addDiscount(signers[0], 20);

        await subscription.connect(signers[0]).subscribe({
            value: ethers.parseEther("0.05") * BigInt(100 - 20) / BigInt(100),
        });

        const subscriber = await subscription.subscriptions(signers[0]);

        await expect(subscriber).to.have.extraDays(30);
        expect(await ethers.provider.getBalance(subscription.target)).to.equal(
            ethers.parseEther("0.04")
        );
    });

    it('should throw an error if discount GREATER than 100%', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);
        await subscription.connect(manager).addDiscount(signers[0], 150);

        await expect(
            subscription.connect(signers[0]).subscribe({
                value: ethers.parseEther("0.05"),
            }),
        ).to.be.revertedWithPanic(0x11); // Arithmetic operation overflowed outside of an unchecked block
    });

    it('should allow to subscribe free if discount 100%', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);
        await subscription.connect(manager).addDiscount(signers[0], 100);

        await subscription.connect(signers[0]).subscribe({
            value: 0,
        });

        const subscriber = await subscription.subscriptions(signers[0]);

        await expect(subscriber).to.have.extraDays(30);
        expect(await ethers.provider.getBalance(subscription.target)).to.equal(
            ethers.parseEther("0")
        );
    });

    it('should be able to subscribe multiple time', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

        await subscription.connect(signers[0]).subscribe({
            value: ethers.parseEther("0.05"),
        });
        await subscription.connect(signers[0]).subscribe({
            value: ethers.parseEther("0.05"),
        });

        const subscriber = await subscription.subscriptions(signers[0]);

        await expect(subscriber).to.have.extraDays(60);
        expect(await ethers.provider.getBalance(subscription.target)).to.equal(
            ethers.parseEther("0.1")
        );
    });

    it('should set correct date even if it was previously subscribed but now it is not active', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);
        await subscription.connect(signers[0]).subscribe({
            value: ethers.parseEther("0.05"),
        });
        await time.increase(  12 * 30 * 24 * 60 * 60); // + ~12 months

        await subscription.connect(signers[0]).subscribe({
            value: ethers.parseEther("0.05"),
        });

        const subscriber = await subscription.subscriptions(signers[0]);
        await expect(subscriber).to.have.extraDays(30);
        expect(await ethers.provider.getBalance(subscription.target)).to.equal(
            ethers.parseEther("0.1")
        );
    })
})

describe("setBasePriceWei", () => {
    it('should change the new base price', async () => {
        const {subscription, owner, manager, signers} = await loadFixture(deployWithSampleSubscription);

        await subscription.connect(manager).setBasePriceWei(ethers.parseEther("0.1"));

        expect(await subscription.basePriceWei()).to.equal(ethers.parseEther("0.1"));
    });
    it('should reject the new base price if not the manager send the transaction', async () => {
        const {subscription, owner, signers} = await loadFixture(deployWithSampleSubscription);

        await expect(
            subscription.connect(owner).setBasePriceWei(ethers.parseEther("0.1"))
        ).to.be.revertedWith(
            "Only the manager can perform this action."
        );

        await expect(
            subscription.connect(signers[0]).setBasePriceWei(ethers.parseEther("0.1"))
        ).to.be.revertedWith(
            "Only the manager can perform this action."
        );
    });
});

describe("addDiscount", () => {
    it('should add discount to the given user', async () => {
        const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

        await subscription.connect(manager).addDiscount(signers[0], 20);

        expect(await subscription.discounts(signers[0])).to.eq(20);
    });
    it('should reject the addition if NOT the manager send the transaction', async () => {
        const {subscription, owner, signers} = await loadFixture(deployWithSampleSubscription);

        await expect(
            subscription.addDiscount(signers[0], 20)
        ).to.be.revertedWith(
            "Only the manager can perform this action."
        );
    });
});