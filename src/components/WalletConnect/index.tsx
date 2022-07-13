import styled from "styled-components";
import { SecondeButton } from "../../style/common";
import { useLightGodwoken } from "../../hooks/useLightGodwoken";
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
  const lightGodwoken = useLightGodwoken();

  const connect = () => {
    if (lightGodwoken) return;

    detectEthereumProvider().then((ethereum: any) => {
      return ethereum.request({ method: "eth_requestAccounts" });
    });
  };
  if (lightGodwoken) return null;
  return (
    <StyleWrapper>
      <SecondeButton onClick={connect}>Connect MetaMask</SecondeButton>
    </StyleWrapper>
  );
};
