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

describe('Subscription.subscribe.test', () => {
    const testCases = [
        {tier: TIER_TYPE.BASIC, tierName: 'Basic', price: "0.05", extraDays: 30},
        {tier: TIER_TYPE.PRO, tierName: 'Pro', price: "0.25", extraDays: 30},
        {tier: TIER_TYPE.YEARLY_PRO, tierName: 'Yearly pro', price: "1.25", extraDays: 30 * 12},
        {tier: TIER_TYPE.LIFETIME_PRO, tierName: 'Lifetime pro', price: "4", extraDays: 30 * 12 * 10},
    ] as const;

    testCases.forEach(({tier, tierName, price, extraDays}) => {
        describe(`subscribe ${tierName} tier`, () => {
            it('should reject if the amount lower than expected', async () => {
                const {subscription, signers} = await loadFixture(deployWithSampleSubscription);

                await expect(
                    subscription.connect(signers[0]).subscribe(tier, {
                        value: ethers.parseEther("0.001"),
                    })
                ).to.be.revertedWith(
                    "The sent amount is not correct."
                );
            });

            it('should reject if the amount greater than expected', async () => {
                const {subscription, signers} = await loadFixture(deployWithSampleSubscription);

                await expect(
                    subscription.connect(signers[0]).subscribe(tier, {
                        value: ethers.parseEther("10"),
                    })
                ).to.be.revertedWith(
                    "The sent amount is not correct."
                );
            });

            it('should add to subscribe list if the amount greater than expected', async () => {
                const {subscription, signers} = await loadFixture(deployWithSampleSubscription);

                await subscription.connect(signers[0]).subscribe(tier, {
                    value: ethers.parseEther(price),
                })
                const subscriber = await subscription.subscriptions(signers[0]);

                expect(subscriber[0]).to.eq(tier);
                await expect(subscriber[1]).to.have.extraDays(extraDays);
                expect(await ethers.provider.getBalance(subscription.target)).to.equal(
                    ethers.parseEther(price)
                );
            });

            it('should allow to pay lower price if the user has a 20% discount', async () => {
                const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);
                await subscription.connect(manager).addDiscount(signers[0], 20);

                await subscription.connect(signers[0]).subscribe(tier, {
                    value: ethers.parseEther(price) * BigInt(100 - 20) / BigInt(100),
                });

                const subscriber = await subscription.subscriptions(signers[0]);

                expect(subscriber[0]).to.eq(tier);
                await expect(subscriber[1]).to.have.extraDays(extraDays);
                expect(await ethers.provider.getBalance(subscription.target)).to.equal(
                    ethers.parseEther(price) * BigInt(100 - 20) / BigInt(100)
                );
            });

            it('should throw an error if discount GREATER than 100%', async () => {
                const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);
                await subscription.connect(manager).addDiscount(signers[0], 150);

                await expect(
                    subscription.connect(signers[0]).subscribe(tier, {
                        value: ethers.parseEther(price),
                    }),
                ).to.be.revertedWithPanic(0x11); // Arithmetic operation overflowed outside of an unchecked block
            });

            it('should allow to subscribe free if discount 100%', async () => {
                const {subscription, manager, signers} = await loadFixture(deployWithSampleSubscription);
                await subscription.connect(manager).addDiscount(signers[0], 100);

                await subscription.connect(signers[0]).subscribe(tier, {
                    value: 0,
                });

                const subscriber = await subscription.subscriptions(signers[0]);

                expect(subscriber[0]).to.eq(tier);
                await expect(subscriber[1]).to.have.extraDays(extraDays);
                expect(await ethers.provider.getBalance(subscription.target)).to.equal(
                    ethers.parseEther("0")
                );
            });

            it('should be able to subscribe multiple time', async () => {
                const {subscription, signers} = await loadFixture(deployWithSampleSubscription);

                await subscription.connect(signers[0]).subscribe(tier, {
                    value: ethers.parseEther(price),
                });
                await subscription.connect(signers[0]).subscribe(tier, {
                    value: ethers.parseEther(price),
                });

                const subscriber = await subscription.subscriptions(signers[0]);

                expect(subscriber[0]).to.eq(tier);
                await expect(subscriber[1]).to.have.extraDays(extraDays * 2);
                expect(await ethers.provider.getBalance(subscription.target)).to.equal(
                    ethers.parseEther(price) * BigInt(2)
                );
            });

            it('should set correct date even if it was previously subscribed but now it is not active', async () => {
                const {subscription, signers} = await loadFixture(deployWithSampleSubscription);
                await subscription.connect(signers[0]).subscribe(tier, {
                    value: ethers.parseEther(price),
                });
                await time.increase(2 * 10 * 12 * 30 * 24 * 60 * 60); // + ~20 years

                await subscription.connect(signers[0]).subscribe(tier, {
                    value: ethers.parseEther(price),
                });

                const subscriber = await subscription.subscriptions(signers[0]);
                expect(subscriber[0]).to.eq(tier);
                await expect(subscriber[1]).to.have.extraDays(extraDays);
                expect(await ethers.provider.getBalance(subscription.target)).to.equal(
                    ethers.parseEther(price) * BigInt(2)
                );
            })
        });
    })
})