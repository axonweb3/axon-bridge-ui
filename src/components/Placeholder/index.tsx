import { LoadingOutlined } from "@ant-design/icons";
import { useAxonBridge } from "../../hooks/useAxonBridge";

export const Placeholder: React.FC = () => {
  const axonBridge = useAxonBridge();
  return <>{lightGodwoken ? <LoadingOutlined /> : "-"}</>;
};
