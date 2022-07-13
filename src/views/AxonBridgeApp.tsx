import "antd/dist/antd.css";
import Withdrawal from "./withdrawal/Withdrawal";
import CkbToAxon from "./CkbToAxon";
import { useEffect, useState } from "react";
import { useAxonBridge } from "../hooks/useAxonBridge";
import { addNetwork } from "../utils/addNetwork";

interface Props {
  activeView?: string;
}

export default function AxonBridgeApp(props: Props) {
  const [activeView, setActiveView] = useState(props.activeView || "deposit");
  useEffect(() => {
    setActiveView(props.activeView || "deposit");
  }, [props.activeView]);

  console.log("AxonBridgeApp render");

  return (
    {
      withdrawal: <Withdrawal></Withdrawal>,
      deposit: <CkbToAxon></CkbToAxon>,
    }[activeView] || <CkbToAxon></CkbToAxon>
  );
}
