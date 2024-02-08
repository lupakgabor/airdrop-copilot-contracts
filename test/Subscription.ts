import {ethers} from "hardhat";
import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
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
    })