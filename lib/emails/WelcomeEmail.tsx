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

interface WelcomeEmailProps {
  productName: string;
}

export function WelcomeEmail({ productName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {productName} — let&apos;s get you set up.</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", padding: "40px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "40px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "24px", fontWeight: "700", color: "#111827" }}>
            Welcome to {productName}!
          </Heading>
          <Text style={{ fontSize: "16px", color: "#374151", lineHeight: "1.6" }}>
            You&apos;re all set. Head over to your dashboard to get started — a few quick steps
            and you&apos;ll see exactly why people love {productName}.
          </Text>
          <Text style={{ fontSize: "14px", color: "#6b7280" }}>
            — The {productName} team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;
