import React from "react";
import { useState } from "react";
import { getDisplayAmount, getFullDisplayAmount } from "../../utils/formatTokenAmount";
import NumericalInput from "./NumericalInput";
import { BI } from "@ckb-lumos/lumos";
import { Input } from "antd";
import { InputCard, Text, Row } from "../../style/common";
import { ReactComponent as CKBIcon } from "../../assets/ckb.svg";
import { Placeholder } from "../Placeholder";
import { formatToThousands } from "../../utils/numberFormat";

interface CKBAddressInputPanelProps {
  value: string;
  onUserInput: (value: string) => void;
  label?: string;
  placeholder?: string;
}
export default function CKBAddressInputPanel({
  value,
  onUserInput,
  label,
  placeholder,
}: CKBAddressInputPanelProps) {
  const [isActive, setActive] = useState(false);
  return (
    <InputCard>
      <Row className="first-row">
        <Text style={{ fontSize: "16px" }}>{label}</Text>
      </Row>
      <Row className="second-row">
        <Input
          className="token-amount-input"
          value={value}
          placeholder={placeholder || "ckb/ckt..."}
          onChange={(event) => {
            // replace commas with periods, because we exclusively uses period as the decimal separator
            onUserInput(event.target.value);}
          }
          style={{padding: '4px', border:"none", boxShadow: isActive ? "none":"none" }}
          onFocus={() => setActive(true)}
        />
      </Row>
    </InputCard>
  );
}
