import {ethers} from "hardhat";
import {loadFixture, time} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {expect} from "chai";

const TIER_TYPE = {
    BASIC: 0,
    PRO: 1,
    YEARLY_PRO: 2,
    LIFETIME_PRO: 3
}

async function deployWithSampleSubscription() {
    const [owner, manager, ...signers] = await ethers.getSigners();

    const Subscription = await ethers.getContractFactory("Subscription");

    const subscription = await Subscription.deploy(owner, manager);

    return {subscription, owner, manager, signers};
}

describe('Subscription.test', () => {
    describe("constructor", () => {
        it("should set the owner and manager and tiers", async () => {
            const {subscription, owner, manager} = await loadFixture(deployWithSampleSubscription);

            expect(await subscription.owner()).to.equal(owner);
            expect(await subscription.manager()).to.equal(manager);
            expect(await subscription.tiers(TIER_TYPE.BASIC)).to.eql(
                [ethers.parseEther("0.05"), BigInt(30 * 24 * 60 * 60)]
            );
            expect(await subscription.tiers(TIER_TYPE.PRO)).to.eql(
                [ethers.parseEther("0.25"), BigInt(30 * 24 * 60 * 60)]
            );
            expect(await subscription.tiers(TIER_TYPE.YEARLY_PRO)).to.eql(
                [ethers.parseEther("1.25"), BigInt( 12 * 30 * 24 * 60 * 60)]
            );
            expect(await subscription.tiers(TIER_TYPE.LIFETIME_PRO)).to.eql(
                [ethers.parseEther("4"), BigInt(10 * 12 * 30 * 24 * 60 * 60)]
            );
        });
    });

    describe('isSubscriptionActive', () => {
        it('should subscription active after subscribe', async () => {
            const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

            await subscription.connect(signers[0]).subscribe(TIER_TYPE.BASIC, {
                value: ethers.parseEther("0.05"),
            });

            expect(await subscription.isSubscriptionActive(signers[0])).is.true;
        });

        it('verifies subscription remains active 20 days post-subscription', async () => {
            const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

            await subscription.connect(signers[0]).subscribe(TIER_TYPE.BASIC, {
                value: ethers.parseEther("0.05"),
            });

            await time.increase(20 * 24 * 60 * 60); // + 20 days

            expect(await subscription.isSubscriptionActive(signers[0])).is.true;
        });

        it('should subscription deactivated after a month', async () => {
            const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

            await subscription.connect(signers[0]).subscribe(TIER_TYPE.BASIC, {
                value: ethers.parseEther("0.05"),
            });

            await time.increase(30 * 24 * 60 * 60); // + 30 days

            expect(await subscription.isSubscriptionActive(signers[0])).is.false;
        })
    });

    describe('calculateDiscount', () => {
        const testCases = [
            {discount: 20, price: '0.1', expectedOutput: '0.08'},
            {discount: 30, price: '0.1', expectedOutput: '0.07'},
            {discount: 33, price: '0.1234', expectedOutput: '0.082678'},
            {discount: 100, price: '0.1234', expectedOutput: '0'},
        ] as const;
        testCases.forEach(({price, discount, expectedOutput}) => {
            it(`give ${discount}% discount`, async () => {
                const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

                const discountedPrice = await subscription.calculateDiscount(
                    ethers.parseEther(price),
                    discount,
                );

                expect(discountedPrice).is.eq(ethers.parseEther(expectedOutput));
            });
        });

        it('give more than 100% discount', async () => {
            const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);

            await expect(
                subscription.calculateDiscount(ethers.parseEther('1'), 150),
            ).to.be.revertedWithPanic(0x11); // Arithmetic operation overflowed outside of an unchecked block
        });
    })

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

    describe("setTierPriceWei", () => {
        it('should change the price', async () => {
            const {subscription, owner, manager, signers} = await loadFixture(deployWithSampleSubscription);

            await subscription.connect(manager).setTierPriceWei(TIER_TYPE.BASIC, ethers.parseEther("0.1"));

            expect((await subscription.tiers(TIER_TYPE.BASIC))[0]).to.equal(ethers.parseEther("0.1"));
        });

        it('should reject the new price if not the manager send the transaction', async () => {
            const {subscription, owner, signers} = await loadFixture(deployWithSampleSubscription);

            await expect(
                subscription.connect(owner).setTierPriceWei(TIER_TYPE.BASIC, ethers.parseEther("0.1"))
            ).to.be.revertedWith(
                "Only the manager can perform this action."
            );

            await expect(
                subscription.connect(signers[0]).setTierPriceWei(TIER_TYPE.BASIC, ethers.parseEther("0.1"))
            ).to.be.revertedWith(
                "Only the manager can perform this action."
            );
        });
    });

    describe("setTierAdditionalDuration", () => {
        it('should change the duration', async () => {
            const {subscription, owner, manager, signers} = await loadFixture(deployWithSampleSubscription);

            await subscription.connect(manager).setTierAdditionalDuration(TIER_TYPE.BASIC, 2 * 30 * 24 * 60 * 60); // 2 months

            expect((await subscription.tiers(TIER_TYPE.BASIC))[1]).to.equal(BigInt(2 * 30 * 24 * 60 * 60));
        });

        it('should reject the new duration if not the manager send the transaction', async () => {
            const {subscription, owner, signers} = await loadFixture(deployWithSampleSubscription);

            await expect(
                subscription.connect(owner).setTierAdditionalDuration(TIER_TYPE.BASIC, 2 * 30 * 24 * 60 * 60)
            ).to.be.revertedWith(
                "Only the manager can perform this action."
            );

            await expect(
                subscription.connect(signers[0]).setTierAdditionalDuration(TIER_TYPE.BASIC, 2 * 30 * 24 * 60 * 60)
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

    describe("gatherDeposit", () => {
        it('should transfer all funds to the owner', async () => {
            const {subscription, manager, owner} = await loadFixture(deployWithSampleSubscription);

            await subscription.subscribe(TIER_TYPE.PRO, {
                value: ethers.parseEther('0.25'),
            })
            const originalBalance = await ethers.provider.getBalance(owner);

            await subscription.connect(manager).gatherDeposit(ethers.parseEther('0.25'))

            expect(await ethers.provider.getBalance(owner) - originalBalance).to.equal(
                ethers.parseEther('0.25')
            );
        });

        it('should reject the gathering if NOT the manager send the transaction', async () => {
            const {subscription, signers} = await loadFixture(deployWithSampleSubscription);
            await subscription.subscribe(TIER_TYPE.PRO, {
                value: ethers.parseEther('0.25'),
            });

            await expect(
                subscription.connect(signers[0]).gatherDeposit(ethers.parseEther('0.25'))
            ).to.be.revertedWith(
                "Only the manager can perform this action."
            );
        });

        it('should reject the gathering if the amount is greater than the available balance', async () => {
            const {subscription, manager} = await loadFixture(deployWithSampleSubscription);

            await expect(
                subscription.connect(manager).gatherDeposit(ethers.parseEther('0.25'))
            ).to.be.revertedWith(
                "The given amount is greater than the balance."
            );
        });
    });

    describe("setSubscription", () => {
        it('should set subscription to the given user', async () => {
            const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);
            const validity = await time.latest() + 24 * 60 * 60 // 1 day

            await subscription.connect(manager).setSubscription(signers[0], TIER_TYPE.PRO, validity);


            const subscriber = await subscription.subscriptions(signers[0]);

            expect(subscriber[0]).to.eq(TIER_TYPE.PRO);
            await expect(subscriber[1]).to.have.extraDays(1);
        });

        it('should reject the addition if NOT the manager send the transaction', async () => {
            const {subscription, signers} = await loadFixture(deployWithSampleSubscription);
            const validity = await time.latest() + 24 * 60 * 60 // 1 day

            await expect(
                subscription.setSubscription(signers[0], TIER_TYPE.PRO, validity)
            ).to.be.revertedWith(
                "Only the manager can perform this action."
            );
        });
    });
});