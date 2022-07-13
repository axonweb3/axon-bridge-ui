import { Card, CardHeader, PageContent, Text } from "../../style/common";
import { WalletConnect } from "../../components/WalletConnect";
import { useAxonBridge } from "../../hooks/useAxonBridge";

const Withdrawal: React.FC = () => {
  const axonBridge = useAxonBridge();

  return (
    <PageContent>
      <Card className="content">
        <WalletConnect></WalletConnect>
        <div style={{ opacity: axonBridge ? "1" : "0.5" }}>
          <CardHeader>
            <Text className="title">
              <span>Withdrawal</span>
            </Text>
          </CardHeader>
          <div className="request-withdrawal">
          </div>
        </div>
      </Card>
      {axonBridge && (
        <Card className="content">
        </Card>
      )}
    </PageContent>
  );
};

export default Withdrawal;
