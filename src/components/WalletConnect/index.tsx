import styled from "styled-components";
import { SecondeButton } from "../../style/common";
import { useAxonBridge } from "../../hooks/useAxonBridge";
import { useAxonBridge } from "../../hooks/useAxonBridge";
import detectEthereumProvider from "@metamask/detect-provider";
const StyleWrapper = styled.div`
  margin-bottom: 24px;
  padding-bottom: 16px;
  text-align: center;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.2);
  button {
    width: 220px;
    border-radius: 8px;
  }
`;

export const WalletConnect: React.FC = () => {
  const axonBridge = useAxonBridge();

  const connect = () => {
    if (axonBridge) return;

    detectEthereumProvider().then((ethereum: any) => {
      return ethereum.request({ method: "eth_requestAccounts" });
    });
  };
  if (axonBridge) return null;
  return (
    <StyleWrapper>
      <SecondeButton onClick={connect}>Connect MetaMask</SecondeButton>
    </StyleWrapper>
  );
};
