import { message } from "antd";
import styled from "styled-components";
import { PrimaryText, Text } from "../../style/common";
import { ReactComponent as CopyIcon } from "../../assets/copy.svg";
import { getDisplayAmount } from "../../utils/formatTokenAmount";
import { BI } from "@ckb-lumos/lumos";
import { Placeholder } from "../Placeholder";
import { formatToThousands } from "../../utils/numberFormat";
import { useLightGodwoken } from "../../hooks/useLightGodwoken";
import copy from "copy-to-clipboard";
const StyleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  .title {
    font-weight: bold;
  }
  .address-row {
    display: flex;
    justify-content: space-between;
    &.eth {
      margin-top: 16px;
    }
  }

  .copy {
    svg {
      margin-right: 4px;
    }
    .copy-text {
      color: #d50066;
    }
    &:hover {
      cursor: pointer;
    }
  }
`;

const BalanceRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
`;
type Props = {
  ckbAddress: string | undefined;
  ckbBalance: string | undefined;
  ethBalance: string | undefined;
  ethAddress: string | undefined;
  wCKBFee: number | 0;
};

export const BridgeWalletInfo: React.FC<Props> = ({ ckbAddress, ckbBalance, ethBalance, ethAddress, wCKBFee }) => {
  const truncateMiddle = (str: string, first = 40, last = 6): string => {
    return str.substring(0, first) + "..." + str.substring(str.length - last);
  };
  const copyAddress = () => {
    copy(ckbAddress || "");
    message.success("copied CKB address to clipboard");
  };

  const copyEthAddress = () => {
    copy(ethAddress || "");
    message.success("copied ethereum address to clipboard");
  };
  const lightGodwoken = useLightGodwoken();
  const decimals = lightGodwoken?.getNativeAsset().decimals;

  return (
    <StyleWrapper>
      {/*
      <div className="address-row">
        <Text className="title">Ckb Wallet Address</Text>
        <div className="copy" onClick={copyAddress}>
          <CopyIcon />
          <Text className="copy-text">Copy Address</Text>
        </div>
      </div>
      <PrimaryText className="address" title={ckbAddress}>
        {ckbAddress ? truncateMiddle(ckbAddress, 11, 11) : <Placeholder />}
      </PrimaryText>
      */}

      <div className="address-row eth">
        <Text className="title">Axon Address</Text>
        <div className="copy" onClick={copyEthAddress}>
          <CopyIcon />
          <Text className="copy-text">Copy Address</Text>
        </div>
      </div>

      <PrimaryText className="address" title={ethAddress}>
        {ethAddress ? ethAddress : <Placeholder />}
      </PrimaryText>

      {/*
      <BalanceRow>
        <Text className="title">CKB Balance</Text>
        <PrimaryText>
          {ckbBalance ? formatToThousands(getDisplayAmount(BI.from(ckbBalance), 8)) + " CKB" : <Placeholder />}
        </PrimaryText>
      </BalanceRow>
      */}

      <BalanceRow>
        <Text className="title">Axon Balance</Text>
        <PrimaryText>
          {ethBalance ? formatToThousands(getDisplayAmount(BI.from(ethBalance), decimals)) + " AT" : <Placeholder />}
        </PrimaryText>
      </BalanceRow>

      <BalanceRow>
        <Text className="title">wCKB fee</Text>
        <PrimaryText>
          {wCKBFee ? formatToThousands(getDisplayAmount(BI.from(wCKBFee), 8)) + " wCKB" : <Placeholder />}
        </PrimaryText>
      </BalanceRow>
    </StyleWrapper>
  );
};
