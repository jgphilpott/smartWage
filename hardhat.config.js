require("@nomicfoundation/hardhat-toolbox");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(
  async ({ solcVersion }) => {
    if (solcVersion === "0.8.26") {
      return {
        version: solcVersion,
        longVersion: solcVersion,
        compilerPath: require.resolve("solc/soljson.js"),
        isSolcJs: true,
      };
    }

    throw new Error(`Unsupported solc version requested: ${solcVersion}`);
  }
);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {}
  }
};
