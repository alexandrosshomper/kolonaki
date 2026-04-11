import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

interface NudgeEmailProps {
  productName: string;
}

export function NudgeEmail({ productName }: NudgeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Still getting started with {productName}? Pick up where you left off.</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", padding: "40px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "40px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "24px", fontWeight: "700", color: "#111827" }}>
            Still getting started?
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151", lineHeight: "1.6" }}>
            You signed up for {productName} but haven&apos;t finished setup yet. Pick up where
            you left off — it only takes a few minutes to reach your first win.
          </Text>
          <Text style={{ fontSize: "14px", color: "#6b7280" }}>
            — The {productName} team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default NudgeEmail;
