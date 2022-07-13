import { isMainnet } from "../env";
import {AxonBridgeConfig, axonBridgeConfig, axonBridgeConfigMap} from "./configTypes";
import { predefined_testnet, predefined_mainnet } from "./lightGodwokenConfig";
import { predefined_testnet as predefined_axon_testnet, predefined_mainnet as predefined_axon_mainnet } from "./axonBridgeConfig";
import { writeStorage } from "@rehooks/local-storage";
import { GodwokenVersion } from "./configTypes";

export function getPredefinedConfig(): axonBridgeConfigMap {
  return isMainnet ? predefined_mainnet : predefined_testnet;
}

export function getPredefinedAxonConfig(): AxonBridgeConfig {
  return isMainnet ? predefined_axon_mainnet : predefined_axon_testnet;
}

// TODO deprecate initConfig, and refactor it to application level, `DefaultLightGodwokenProvider` would be design in stateless
export function initConfig(env: GodwokenVersion, axonBridgeConfig?: axonBridgeConfigMap): axonBridgeConfig {
  const config = axonBridgeConfig || getPredefinedConfig();
  if (!localStorage.getItem("advanced-settings")) {
    setAdvancedSettingsMap({
      v0: {
        MIN_CANCEL_DEPOSIT_TIME: config.v0.layer2Config.MIN_CANCEL_DEPOSIT_TIME,
      },
      v1: {
        MIN_CANCEL_DEPOSIT_TIME: config.v1.layer2Config.MIN_CANCEL_DEPOSIT_TIME,
      },
    });
  }
  return config[env];
}

type AdvancedSettings = {
  MIN_CANCEL_DEPOSIT_TIME: number;
};
type AdvancedSettingsMap = Record<GodwokenVersion, AdvancedSettings>;

export function getAdvancedSettings(version: GodwokenVersion): AdvancedSettings {
  let settings;
  try {
    settings = localStorage.getItem("advanced-settings");
    if (!settings) {
      throw new Error("[getAdvancedSettingsMap] Local advanced-settings is empty");
    }
    return JSON.parse(settings)[version];
  } catch (error) {
    return {
      MIN_CANCEL_DEPOSIT_TIME: getPredefinedConfig()[version].layer2Config.MIN_CANCEL_DEPOSIT_TIME,
    };
  }
}

function setAdvancedSettingsMap(settings: AdvancedSettingsMap) {
  writeStorage("advanced-settings", JSON.stringify(settings));
}

function setAxonAdvancedSettings(settings: AdvancedSettings) {
  writeStorage("axon-advanced-settings", JSON.stringify(settings));
}

export function initAxonConfig(axonBridgeConfig?: AxonBridgeConfig): AxonBridgeConfig {
  const config = axonBridgeConfig || getPredefinedAxonConfig();
  if (!localStorage.getItem("axon-advanced-settings")) {
    setAxonAdvancedSettings({
      MIN_CANCEL_DEPOSIT_TIME: config.axonConfig.MIN_CANCEL_DEPOSIT_TIME,
    });
  }
  return config;
}
