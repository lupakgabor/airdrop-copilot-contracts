import 'dotenv/config';
import {HardhatUserConfig} from "hardhat/config";
import "./matchers";

const config: HardhatUserConfig = {
    solidity: "0.8.19",
    networks: {
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL,
            accounts: [process.env.PRIVATE_KEY!],
        }
    }
};

export default config;
